# TASK — `hrp-ui-v1-job-card-stamps-brand`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-ui-v1-job-card-stamps-brand` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | T1B chạm schema additive + migration + public contract (JobPosting.isHighReward/isExpiringSoon, public DTO chain, editor shell). Tier 0 / T0 override T0 §contract cũ "STANDARD + NONE" → "CRITICAL + LIGHT" cho vertical slice này. Risk acceptance: T0. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1B` |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `prisma/schema.prisma`; một forward-only migration mới `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` (timestamp strictly greater than `20260930090000_p1a05_hr_staff_job_openings_update_rls`, tránh xung đột với bất kỳ timestamp production nào T0 đã liệt kê); `src/domains/job-board/components/landing/stamp-defs.ts`; `src/domains/job-board/components/landing/stamp-badge.tsx`; `src/domains/job-board/components/landing/featured-job-card.tsx`; `src/domains/job-board/public.service.ts`; `src/domains/job-board/public-select.static.test.ts`; `src/domains/job-board/public-types.ts`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/staffing/job-posting-list.service.ts`; `app/api/admin/jobs/job-postings/[id]/route.ts`; `app/api/admin/jobs/job-postings/[id]/route.test.ts`; `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (T1B ownership theo T0 §C); `app/(jobs)/viec-lam/page.tsx`; `app/(jobs)/viec-lam/[slug]/page.tsx`; `app/(portal)/page.tsx`; `app/components/GlobalNavbar.tsx`; `app/components/GlobalFooter.tsx`; `app/(portal)/ve-chung-toi/page.tsx` (delete); `app/(portal)/ve-chung-toi/` (delete folder); `app/layout.tsx`; `app/admin/layout.tsx`; `app/login/login-form.tsx`; `public/hrp-logo.webp` (NEW); `public/logo.png` (sweep); `src/shared/ui/role-guard/role-guard-layout.tsx`; `tests/db/job-posting-stamps.integration.test.ts`; `src/domains/job-board/job-posting-stamps-mapping.test.ts`; `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts`; `docs/tasks/hrp-ui-v1-job-card-stamps-brand/{TASK.md,HANDOFF.md}`. |
| Forbidden paths | `prisma/migrations/20260924180000_p1a0_jobposting_content_fields/`; `prisma/migrations/20260925000000_p1a1_canonical_apply_jobpostings/`; `prisma/migrations/20260925120000_p1b_public_apply_lifecycle/`; `prisma/migrations/20260926120000_p1a01_jobposting_stamps/`; `prisma/migrations/20260928220000_p1a04_scoped_recruiter_authority/`; `prisma/migrations/20260929010000_p1a04_correction_recruiter_candidate_claim/`; `prisma/migrations/20260929020000_p1a04_correction_hr_staff_handling_claim_insert_rls/`; `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/`; `src/domains/talent/recruiter-workbench.*`; `app/api/admin/recruiter-workbench/**`; `tests/db/recruiter-workbench.integration.test.ts`; `src/domains/media/**`; `src/domains/referrals/**` ngoài `attribution-redirect.service` + `redirect-token` (read-only); `src/domains/crm/**`; production `.env*`; production DB / migration deploy scripts; `C:\CodeApp\hrpartner-logo.webp` (link runtime tới ổ C:); `ve-hrp.html` (tài liệu pháp lý/chính sách); `app/ctv/**`; `app/worker/**`; `app/bod/**`; **Hotline/Zalo/Messenger menu, Tin tức & Cẩm nang toggle, Sticky bottom announcement, JobPosting cover/gallery, Video/YouTube, Inline rich-text media, Lifecycle/auth/RLS, Mốc 2 F6, P2/AFF**. |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1`. Migration = `NOT_RUN`. |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `TIER3_LIGHT_AUDIT` |

> Lane = CRITICAL, Audit = LIGHT (T0 §A override "STANDARD + NONE" → "CRITICAL + LIGHT" cho vertical slice này; lý do: schema additive 2 BOOLEAN NOT NULL DEFAULT false + public contract JobPosting.isHighReward/isExpiringSoon + editor shell + brand asset + route removal — chạm schema/migration/public contract quan trọng, blast radius rộng homepage+listing+admin). Correction budget = 1. Final gate = `TIER3_LIGHT_AUDIT`. Production migration = `NOT_RUN`.

## 1. Outcome

### 1.1 User-visible outcome

1. **Authoring — JobPosting editor có đủ 4 toggle stamp ở trạng thái DRAFT**: Hot (đã có), Tuyển gấp (đã có), Thưởng cao (mới), Sắp hết hạn (mới). 4 boolean canonical lưu cùng PATCH draft update authority hiện hữu; optimistic revision + idempotency-key policy giữ nguyên (DEC-04). Toggle mới disable khi status ≠ DRAFT (giống pattern P1-A0.1 C-04). Admin preview phản ánh đúng public render.

2. **Public card — đồng nhất qua 1 shared stamp implementation**:
   - `JobStampBadge` (shared component) nhận đủ 4 flag → render 0–4 stamp theo `STAMP_RANK` order, neo góc trên-trái card với offset index, animation `job-stamp-attention` 0.7↔1.0 (đã có sẵn trong `app/globals.css`), `motion-reduce:animate-none motion-reduce:opacity-100` tắt animation khi user yêu cầu. KHÔNG animate toàn card.
   - `FeaturedJobCard` (homepage) giữ art-direction `RubberStamp` riêng (Y10.6/Y10.7) nhưng đọc flags qua `deriveStampsFromFlags`.
   - `RelatedJobsSection`, `BestJobsSection` (homepage), homepage, listing `/viec-lam`, detail `/viec-lam/[slug]` — không surface nào tự render badge riêng.

3. **Persistence**:
   - Forward-only migration `20261004120000_ui_v1_jobposting_stamp_flags` (timestamp per T0 §B) ADD 2 column: `is_high_reward BOOLEAN NOT NULL DEFAULT false` + `is_expiring_soon BOOLEAN NOT NULL DEFAULT false` trên `model JobPosting`.
   - Default false; existing rows giữ false; không heuristic backfill.
   - Production migration = `NOT_RUN` per task brief.

4. **Brand identity**:
   - Logo Owner cung cấp (`C:\CodeApp\hrpartner-logo.webp`, 52,334 bytes webp) được đưa vào `public/hrp-logo.webp`. Aspect ratio giữ nguyên — không kéo méo.
   - Tất cả logo surface công khai + admin + login + role-guard layout đều trỏ về asset mới.
   - Alt text phù hợp (vd `alt="HRP — Việc làm miền Bắc"`).
   - Default `metadata.title` ở `app/layout.tsx` đổi thành `"Việc làm miền Bắc - Kết nối để thành công - HRP"`. Template giữ `%s · HRP`. JobPosting detail metadata riêng KHÔNG bị phá vỡ.

5. **Remove About branch**:
   - `app/(portal)/ve-chung-toi/page.tsx` xoá; cả folder xoá.
   - Nav link "Về HRP Việt Nam" trong `app/components/GlobalNavbar.tsx:23` xoá.
   - Footer link "Về chúng tôi" trong `app/components/GlobalFooter.tsx:11` xoá.
   - Route nào trỏ về `/ve-chung-toi` phải 404 theo Next.js App Router, KHÔNG redirect.
   - `ve-hrp.html` (legal/policy ở `public/`) KHÔNG xoá.

6. **F8 integration from T1A (T0 §C ownership clarification)**:
   - T1B sở hữu `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (UI V1 cần 4 stamp toggles + consume safe F8 mapper).
   - Sau khi T1A Mốc 2A merge vào main, forward-merge `origin/main` vào worktree T1B (no rebase, no force-push).
   - Nếu T1A Mốc 2A cung cấp shared safe error mapper và `editor-shell.tsx` vẫn dùng `readErrorMessage` cục bộ, thay thành consume shared mapper. KHÔNG tạo mapper thứ hai. KHÔNG tự mở rộng scope F8.
   - T1A chỉ sở hữu shared safe-error mapper. T1B không tạo mapper thứ hai.

### 1.2 Non-goals

- KHÔNG suy "Thưởng cao" / "Sắp hết hạn" từ heuristic (salary, deadlineDate, postedAt, hash).
- KHÔNG sửa migration cũ.
- KHÔNG cho phép sửa stamp khi status ≠ DRAFT.
- KHÔNG tự xây thêm UI/badge/animation library.
- KHÔNG tự ý đổi `metadata.title` của các page con.
- KHÔNG sửa lifecycle/auth/RLS, JobOpening state machine, JobPosting publish state machine, idempotency mechanism, withDbContext helper.
- KHÔNG mở Hotline/Zalo/Messenger menu, Tin tức & Cẩm nang toggle, Sticky bottom announcement, JobPosting cover/gallery, Video/YouTube, Inline rich-text media.
- KHÔNG tích hợp Mốc 2 F6, P2/AFF.
- KHÔNG chạy production migration.
- KHÔNG merge/deploy.
- KHÔNG sửa scope T1A hoặc T1C.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/job-board/components/landing/stamp-defs.ts:11` — `STAMPS` registry đã có 4 key `tuyen-gap`, `hot`, `thuong-cao`, `moi`; `STAMP_RANK` order. Key `thuong-cao` (THƯỞNG CAO, amber) đã có sẵn. | Chứng minh "Thưởng cao" đã có visual + color + icon — chỉ cần wire canonical flag. |
| `EV-02` | `src/domains/job-board/components/landing/stamp-defs.ts:105` — `deriveStampsFromFlags(isHot, isUrgent)` hiện chỉ sinh `tuyen-gap` + `hot`; comment line 96-103 ghi "Stamp `thuong-cao` / `moi` giữ lại trong registry (cho legacy callers) nhưng predicate hiện không sinh chúng". | Helper cần mở rộng nhận 4 flag. |
| `EV-03` | `src/domains/job-board/components/landing/stamp-badge.tsx:36` — `JobStampBadge({ isHot, isUrgent, stamps?, className?, size? })`. Line 69: `keys = stamps ?? deriveStampsFromFlags(isHot, isUrgent)`. | Mở rộng props thành 4 flag. |
| `EV-04` | `src/domains/job-board/components/landing/featured-job-card.tsx:84` — `RubberStamp` đọc `stamps?: StampKey[]` qua prop. Line 7 import `deriveStampsFromFlags`. | Homepage FeaturedJobCard cần propagate 2 flag mới. |
| `EV-05` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx:92` — editor shell hiện có 2 toggle (`isHot`, `isUrgent`) ở line 419-434. Line 100-101 state, line 137-138 snapshot, line 151-152 dirty check, line 186-187 PATCH body, line 217-218 snapshot reset, line 226-227 setIsHot/setIsUrgent. | Mở rộng thành 4 toggle. |
| `EV-06` | `app/api/admin/jobs/job-postings/[id]/route.ts:181` — PATCH route validate `isHot` + `isUrgent` qua `assertStrictBoolean`; line 212 `requestBody` array length 11. | Mở rộng cho 2 flag mới, idempotency hash length 13. |
| `EV-07` | `src/domains/staffing/job-posting-authoring.service.ts:322` — `assertBoolean(label: 'isHot' \| 'isUrgent', value)`. Line 1039 `toJobPostingDto` copy `isHot`, `isUrgent`. | Mở rộng union label 4 flag. |
| `EV-08` | `src/domains/staffing/job-posting-list.service.ts:80` — `JobPostingListItemDto` có `isHot`, `isUrgent`. Line 175-176 mapper copy. Line 209-210 `JobPostingDetailDto` có `isHot`, `isUrgent`. Line 261-262 mapper copy. | Thêm 2 field. |
| `EV-09` | `prisma/schema.prisma:577` — `model JobPosting` đã có `isHot Boolean @default(false) @map("is_hot")` + `isUrgent Boolean @default(false) @map("is_urgent")`. | Thêm 2 field ngay sau line 578. |
| `EV-10` | `src/domains/job-board/public.service.ts:681` — `publicSelect` allowlist. `src/domains/job-board/public.service.ts:60` — `PublicJobDto` có `isHot`, `isUrgent`. `src/domains/job-board/public.service.ts:295` — `PublicProjectRow` có `isHot`, `isUrgent`. `src/domains/job-board/public.service.ts:310` — `PublicJobPostingSelectPayload` SELECT payload có `isHot`, `isUrgent`. | Mở rộng 2 field. |
| `EV-11` | `src/domains/job-board/public-select.static.test.ts` — static test fence đọc `publicSelect` source. | Cập nhật allowlist thêm 2 key. |
| `EV-12` | `app/globals.css:668` — `.job-stamp-attention` + `@keyframes job-stamp-blink` 0.7↔1.0 + `motion-reduce:animate-none motion-reduce:opacity-100`. | KHÔNG cần thêm CSS. |
| `EV-13` | `app/(portal)/ve-chung-toi/page.tsx` — file 164 dòng, default export `VeChungToiPage` + metadata `Về HRP — Hệ thống quản trị cung ứng nhân lực` + array `CARDS`. | File cần xoá. |
| `EV-14` | `app/components/GlobalNavbar.tsx:23` — `{ href: '/ve-chung-toi', label: 'Về HRP Việt Nam', type: 'route' }`. `app/components/GlobalFooter.tsx:11` — `{ href: '/ve-chung-toi', label: 'Về chúng tôi', type: 'route' }`. | Xoá 2 entry. |
| `EV-15` | `app/layout.tsx:5` — `metadata = { title: { default: 'HRPartner', template: '%s · HRPartner' }, description: 'Nền tảng kết nối và quản lý nhân sự thuê ngoài HRPartner', icons: { icon: '/favicon.ico' } }`. | Default title đổi. |
| `EV-16` | `C:\CodeApp\hrpartner-logo.webp` (52,334 bytes, webp). | Copy vào `public/hrp-logo.webp`. |
| `EV-17` | `app/components/GlobalNavbar.tsx:120` — img src `/logo.png` alt `HRP Logo`. `app/login/login-form.tsx:73` — img src `/logo.png` alt `HRP Logo`. `src/shared/ui/role-guard/role-guard-layout.tsx:416` — `logoSrc = '/logo.png'`. | Sweep 3 reference sang `/hrp-logo.webp`. |
| `EV-18` | `prisma/migrations/20260930090000_p1a05_hr_staff_job_openings_update_rls/` — migration mới nhất. | Migration T1B dùng timestamp `>= 20261003000000`. |
| `EV-19` | `tests/db/job-posting-stamps.integration.test.ts` (P1-A0.1, 11 cases). | Mở rộng thêm 2-4 case cho 2 flag mới. |
| `EV-20` | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (nếu có) HOẶC `src/domains/job-board/job-posting-stamps-mapping.test.ts`. | Mở rộng cover 4 flag. |
| `EV-21` | `app/api/admin/jobs/job-postings/[id]/route.test.ts` — test matrix cover `isHot` + `isUrgent`. | Mở rộng matrix cho 4 flag. |
| `EV-22` | `app/(portal)/page.tsx:376` — comment `{/* ─── UI04d Task D v1.9 (11/09/2026): Đưa HrpIntro (Về HRP) lên trên RecruitingProjects. */}`. | Verify `HrpIntroSection` còn dùng ở đâu. |
| `EV-23` | `src/domains/job-board/public-types.ts` (P1-A0.1) — `PublicJobDto` + `PublicJobDetailDto`; detail `extends` base. | Mở rộng base. |
| `EV-24` | `src/domains/staffing/job-posting-list.service.ts:170` — SELECT include `isHot`, `isUrgent` ở list query. Line 250 SELECT include ở detail query. | Mở rộng SELECT. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Schema additive `JobPosting`: thêm `isHighReward Boolean @default(false) @map("is_high_reward")` + `isExpiringSoon Boolean @default(false) @map("is_expiring_soon")` ngay sau line 578. Forward-only migration. KHÔNG DROP/RENAME/heuristic backfill. Migration timestamp = `20261004120000_ui_v1_jobposting_stamp_flags` (per T0 §B). | CHOSEN |
| `DEC-02` | `STAMPS` registry: thêm key mới `sap-het-han` (Sắp hết hạn) với tone ấm phù hợp urgency (e.g. orange-red `bg-orange-600` lucide `Clock` hoặc `Timer`). Key `thuong-cao` (Thưởng cao) đã có sẵn — reuse nguyên xi. Key `moi` (MỚI) legacy giữ nguyên trong registry nhưng KHÔNG dùng trong T1B. | CHOSEN |
| `DEC-03` | `STAMP_RANK` order: `tuyen-gap: 0`, `hot: 1`, `sap-het-han: 2`, `thuong-cao: 3`, `moi: 4` (giữ `moi` ở rank 4 để không break compile ở callers cũ). | CHOSEN |
| `DEC-04` | `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` — mở rộng 4 flag, sort theo `STAMP_RANK`. Helper vẫn ở `stamp-defs.ts`. | CHOSEN |
| `DEC-05` | `JobStampBadge({ isHot, isUrgent, isHighReward, isExpiringSoon, stamps?, className?, size? })` — mở rộng props 4 flag. | CHOSEN |
| `DEC-06` | `FeaturedJobCard` (`featured-job-card.tsx`): thêm 2 field `isHighReward?`, `isExpiringSoon?` vào `FeaturedJobCardProps['job']` (line 11). Caller homepage truyền đủ 4 flag qua `deriveStampsFromFlags`. | CHOSEN |
| `DEC-07` | `updateDraftContent` (`job-posting-authoring.service.ts`): thêm `isHighReward?: boolean` + `isExpiringSoon?: boolean` vào `UpdateDraftContentInput`. Validator `assertBoolean` mở rộng union label sang 4 flag. Field undefined = giữ giá trị hiện tại; non-boolean = `INVALID_INPUT 400`. | CHOSEN |
| `DEC-08` | PATCH route `/api/admin/jobs/job-postings/[id]` (`route.ts`): thêm 2 entry vào `PATCH_BODY_ALLOWED_KEYS`. `assertStrictBoolean` cho 2 flag. `requestBody` array length 11 → 13. | CHOSEN |
| `DEC-09` | Editor shell `editor-shell.tsx`: thêm 2 toggle `Thưởng cao` + `Sắp hết hạn` cạnh 2 toggle hiện hữi. State + snapshot + dirty check + PATCH body. Disabled khi `status !== 'DRAFT'`. | CHOSEN |
| `DEC-10` | Public DTO chain: `PublicJobPostingSelectPayload` thêm 2 field. `PublicProjectRow` thêm 2 field (internal). `PublicJobDto` thêm 2 field. Mappers copy 2 field. `publicSelect` allowlist thêm 2 key. | CHOSEN |
| `DEC-11` | `JobPostingListItemDto` + `JobPostingDetailDto` (`job-posting-list.service.ts`) thêm 2 field. SELECT include 2 field. Mappers copy 2 field. | CHOSEN |
| `DEC-12` | Logo: copy `C:\CodeApp\hrpartner-logo.webp` (52,334 bytes) → `public/hrp-logo.webp` qua first-class write tool. Sweep 3 reference sang `/hrp-logo.webp`. Alt text: `alt="HRP — Việc làm miền Bắc"`. `public/logo.png` cũ giữ nếu còn dùng ở surface khác. | CHOSEN |
| `DEC-13` | Default `metadata.title` ở `app/layout.tsx`: đổi `default: 'HRPartner'` → `'Việc làm miền Bắc - Kết nối để thành công - HRP'`. Template giữ `'%s · HRP'`. Default `description` cập nhật. | CHOSEN |
| `DEC-14` | JobPosting detail metadata riêng: KHÔNG đổi. Admin pages: KHÔNG đổi `metadata` per-page. | CHOSEN |
| `DEC-15` | Xoá `app/(portal)/ve-chung-toi/page.tsx` + folder. Xoá nav link `GlobalNavbar.tsx:23` + `GlobalFooter.tsx:11`. `ve-hrp.html` KHÔNG xoá. | CHOSEN |
| `DEC-16` | `/ve-chung-toi` route sau khi xoá → Next.js App Router trả 404 tự động. | CHOSEN |
| `DEC-17` | Build vs Adopt = `N/A`. Lý do: (a) không thêm dependency mới — chỉ thêm 1 key vào `STAMPS` registry (lucide-react 0.468.0 đã có `Clock`/`Timer`); (b) 2 schema columns additive cùng pattern `isHot`/`isUrgent`; (c) logo asset copy từ local file. | CHOSEN |
| `DEC-18` | Build vs Automate = `N/A`. Lý do: không tạo/thay connector, scheduler, notification worker hay multi-system workflow. | CHOSEN |
| `DEC-19` | Lane = CRITICAL, Audit = LIGHT. Risk acceptance: T0 (T0 §A override "STANDARD + NONE" → "CRITICAL + LIGHT" cho vertical slice có schema/migration + public contract). | CHOSEN |
| `DEC-20` | F8 forward-merge: sau khi T1A Mốc 2A merge vào `main`, `git merge --no-ff origin/main` (no rebase, no force-push). Nếu T1A cung cấp shared safe error mapper, consume trong `editor-shell.tsx`. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Stamp registry (key + color + icon + label) | `src/domains/job-board/components/landing/stamp-defs.ts` — đã có 4 key `tuyen-gap`/`hot`/`thuong-cao`/`moi`; lucide-react 0.468.0 đã pin (Flame, Star, Gift, Sparkles) | `N/A` (reused + thêm 1 key) | n/a | n/a | n/a | Đã đủ icon set sẵn cho `Clock`/`Timer` nếu Tier 1 cần cho `sap-het-han`. Không thêm package. |
| Stamp renderer (shared component) | `src/domains/job-board/components/landing/stamp-badge.tsx` (`JobStampBadge`) + `featured-job-card.tsx` (`RubberStamp`) | `N/A` (reused) | n/a | n/a | n/a | P1-A0.1 C-05 đã khóa "1 shared implementation duy nhất". T1B chỉ mở rộng props. |
| Schema additive 2 boolean columns | `prisma/schema.prisma` `model JobPosting` line 577-578 (P1-A0.1 freeze) | `N/A` (reused pattern) | n/a | n/a | n/a | `isHot` + `isUrgent` đã chứng minh additive BOOLEAN NOT NULL DEFAULT false an toàn. T1B thêm 2 cột cùng pattern. |
| Animation keyframe | `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` 0.7↔1.0 (P1-A0.1 freeze) | `N/A` (reused) | n/a | n/a | n/a | Đã đúng opacity + reduced-motion. Không thêm CSS. |
| Logo asset | Owner cung cấp `C:\CodeApp\hrpartner-logo.webp` (52,334 bytes webp) | `N/A` (copy local, không qua package manager) | Owner-owned | n/a | `public/hrp-logo.webp` (served at runtime) | T0 §"Không link trực tiếp tới ổ C: ở runtime". Copy một lần vào repo asset. |
| Metadata default | `app/layout.tsx` `metadata.title.default` | `N/A` (text swap) | n/a | n/a | n/a | Direct-fix copy change. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Stamp persistence | PATCH `/api/admin/jobs/job-postings/[id]` hiện hữu + `withIdempotency` helper + revision check | `N/A` (reused mutation authority) | n/a | Repo-owned (service `updateDraftContent`) | Có sẵn (Idempotency-Key + revision) | Có sẵn (canonical gate) | T0 §"Save/revision/idempotency hiện hữu được bảo toàn" |
| Public projection | `src/domains/job-board/public.service.ts` `publicSelect` + mappers + static test fence | `N/A` (reused) | n/a | Repo-owned | n/a | n/a | T0 §"API/service/DTO/public projection mang đúng canonical fields" |
| Brand asset serving | `public/` static folder + Next.js public asset convention | `N/A` (Next.js built-in) | n/a | n/a | n/a | n/a | Standard Next.js public asset. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Schema additive `JobPosting`: `isHighReward Boolean @default(false) @map("is_high_reward")` + `isExpiringSoon Boolean @default(false) @map("is_expiring_soon")` ngay sau line 578. Migration forward-only, NOT NULL DEFAULT false, ADD-only. KHÔNG DROP/RENAME/heuristic backfill. Migration timestamp = `20261004120000_ui_v1_jobposting_stamp_flags` (per T0 §B). |
| `RQ-02` | `npx prisma validate` + `npx prisma generate` xanh trên schema mới. `JobPosting.isHighReward` + `JobPosting.isExpiringSoon` xuất hiện trong `node_modules/.prisma/client/index.d.ts`. |
| `RQ-03` | `STAMPS` registry (`src/domains/job-board/components/landing/stamp-defs.ts`) thêm key `sap-het-han` với label "SẮP HẾT HẠN", color/icon chọn phù hợp urgency. Key `thuong-cao` (Thưởng cao) reuse nguyên xi. Key `moi` legacy giữ nguyên trong registry, không dùng trong T1B. |
| `RQ-04` | `STAMP_RANK` order: `tuyen-gap: 0`, `hot: 1`, `sap-het-han: 2`, `thuong-cao: 3`, `moi: 4`. |
| `RQ-05` | `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` — mở rộng 4 flag, sort theo `STAMP_RANK`. Helper vẫn ở `stamp-defs.ts`. |
| `RQ-06` | `JobStampBadge` (`src/domains/job-board/components/landing/stamp-badge.tsx`) props: `isHot: boolean`, `isUrgent: boolean`, `isHighReward: boolean`, `isExpiringSoon: boolean`, `stamps?: readonly StampKey[]`, `className?: string`, `size?: 'sm' \| 'md'`. Line 69 `keys = stamps ?? deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)`. |
| `RQ-07` | `FeaturedJobCard` (`src/domains/job-board/components/landing/featured-job-card.tsx`) `FeaturedJobCardProps['job']` thêm 2 optional field `isHighReward?: boolean`, `isExpiringSoon?: boolean`. Caller homepage (`app/(portal)/page.tsx`) truyền đủ 4 flag. |
| `RQ-08` | `updateDraftContent` (`src/domains/staffing/job-posting-authoring.service.ts`) `UpdateDraftContentInput` thêm `isHighReward?: boolean` + `isExpiringSoon?: boolean`. `assertBoolean` validator mở rộng union label sang 4 flag `'isHot' \| 'isUrgent' \| 'isHighReward' \| 'isExpiringSoon'`. Validator: `undefined` = giữ; `true`/`false` = cập nhật; non-boolean = `INVALID_INPUT 400`. DB write `data` object thêm 2 field. |
| `RQ-09` | `JobPostingModelRow` thêm 2 field `isHighReward: boolean`, `isExpiringSoon: boolean`. `toJobPostingDto` mapper copy 2 field. |
| `RQ-10` | PATCH route `/api/admin/jobs/job-postings/[id]` (`app/api/admin/jobs/job-postings/[id]/route.ts`): `PATCH_BODY_ALLOWED_KEYS` Set thêm `isHighReward`, `isExpiringSoon`. `assertStrictBoolean` cho 2 flag. `requestBody` array length 11 → 13. |
| `RQ-11` | Editor shell (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`): 4 toggle ở DRAFT-only mode. 2 toggle mới `Thưởng cao` (aria-label "Đánh dấu JobPosting có thưởng cao", testId `stamp-toggle-reward`) + `Sắp hết hạn` (aria-label "Đánh dấu JobPosting sắp hết hạn", testId `stamp-toggle-expiring`). |
| `RQ-12` | `JobPostingListItemDto` + `JobPostingDetailDto` (`src/domains/staffing/job-posting-list.service.ts`) thêm `isHighReward: boolean`, `isExpiringSoon: boolean`. SELECT include 2 field ở list query + detail query. Mappers copy 2 field. |
| `RQ-13` | `PublicJobPostingSelectPayload` (`src/domains/job-board/public.service.ts:310`) thêm `isHighReward: boolean`, `isExpiringSoon: boolean`. `PublicProjectRow` (`src/domains/job-board/public.service.ts:295`) thêm 2 field (internal). `PublicJobDto` (`src/domains/job-board/public.service.ts:60`) thêm 2 field. Mappers copy 2 field. `publicSelect` (`src/domains/job-board/public.service.ts:681`) allowlist thêm 2 key. |
| `RQ-14` | `src/domains/job-board/public-select.static.test.ts` allowlist update: thêm `isHighReward`, `isExpiringSoon` vào sorted top-level keys. |
| `RQ-15` | Logo asset: `public/hrp-logo.webp` (NEW). Copy từ `C:\CodeApp\hrpartner-logo.webp` qua first-class write tool. Verify file size 52,334 bytes, extension `.webp`. Sweep 3 reference: `app/components/GlobalNavbar.tsx:120` (`/logo.png` → `/hrp-logo.webp`), `app/login/login-form.tsx:73` (same), `src/shared/ui/role-guard/role-guard-layout.tsx:416` (`logoSrc = '/logo.png'` → `logoSrc = '/hrp-logo.webp'`). Alt text đổi từ `"HRP Logo"` → `"HRP — Việc làm miền Bắc"`. |
| `RQ-16` | Default `metadata.title` ở `app/layout.tsx`: `default: 'Việc làm miền Bắc - Kết nối để thành công - HRP'`. Template giữ `'%s · HRP'`. Default `description` cập nhật. |
| `RQ-17` | Xoá `app/(portal)/ve-chung-toi/page.tsx` (164 dòng) + cả folder `app/(portal)/ve-chung-toi/`. Xoá nav link `app/components/GlobalNavbar.tsx:23` ("Về HRP Việt Nam"). Xoá footer link `app/components/GlobalFooter.tsx:11` ("Về chúng tôi"). Verify `ve-hrp.html` (legal/policy) KHÔNG bị xoá. |
| `RQ-18` | `/ve-chung-toi` route sau khi xoá file → Next.js App Router trả 404 tự động. KHÔNG tạo file mới, KHÔNG thêm redirect, KHÔNG re-export `VeChungToiPage`. |
| `RQ-19` | F8 integration: sau khi T1A Mốc 2A merge vào `main`, Tier 1 forward-merge `origin/main` vào worktree T1B (no rebase, no force-push). Nếu T1A Mốc 2A cung cấp shared safe error mapper (e.g. `readErrorMessage` ở shared module) và `app/admin/jobs/job-postings/[id]/editor-shell.tsx:83` hiện dùng cục bộ, thay bằng consume shared mapper. KHÔNG tạo mapper thứ hai. |
| `RQ-20` | Visual: stamp neo góc trên-trái card với offset index (stamp sau lệch xuống để không chồng), KHÔNG che title/salary/CTA, KHÔNG gây horizontal overflow trên mobile (≤ 375px viewport). |
| `RQ-21` | Text/contrast/accessibility: mỗi stamp có `aria-label` rõ ràng, color đạt WCAG AA contrast ratio cho text vs background. Không animate toàn card. Reduced-motion tự tắt animation + set opacity về 1.0. |

### 4.2 Scope boundaries

- **In:** schema additive (2 columns); một forward-only migration mới; `stamp-defs.ts`; `stamp-badge.tsx`; `featured-job-card.tsx`; service `updateDraftContent` + `assertBoolean` + `toJobPostingDto` + `JobPostingModelRow`; `job-posting-list.service.ts`; PATCH route; `route.test.ts`; editor shell; public DTO chain; `public-select.static.test.ts`; `public/hrp-logo.webp` (NEW); 3 logo reference sweep; `app/layout.tsx` metadata; `app/(portal)/ve-chung-toi/` (delete); 2 nav link (delete); F8 forward-merge từ main sau T1A Mốc 2A; targeted unit tests + 1 integration test extension; `docs/tasks/hrp-ui-v1-job-card-stamps-brand/{TASK.md,HANDOFF.md}`.
- **Out:** production migration (NOT_RUN); production deploy; sửa migration cũ; tự tạo UI/badge library mới; sửa lifecycle/auth/RLS/job-opening state machine/job-posting publish state machine/idempotency helper; Hotline/Zalo/Messenger menu; Tin tức & Cẩm nang toggle; Sticky bottom announcement; JobPosting cover/gallery; Video/YouTube; Inline rich-text media; Mốc 2 F6; P2/AFF; ve-hrp.html; tích hợp T1A (chỉ forward-merge consume shared mapper nếu có); tích hợp T1C; merge/deploy.
- **Allowed task artifacts:** `docs/tasks/hrp-ui-v1-job-card-stamps-brand/**`.

### 4.3 Domain boundaries

- **Data/state:** `JobPosting` status state machine không đổi. Schema additive 2 BOOLEAN NOT NULL DEFAULT false. Existing rows giữ false (không backfill). `deriveStampsFromFlags` chỉ derive từ canonical flags — KHÔNG heuristic. Stamp `moi` legacy giữ trong registry nhưng không dùng trong T1B.
- **Permission/security:** Role gate PATCH `/api/admin/jobs/job-postings/[id]` giữ nguyên (ADMIN/HR_MANAGER/HR_STAFF). `assertMutationRole` không đổi. RLS không đổi. `withDbContext` không đổi.
- **Interface/API:** PATCH route mở rộng `PATCH_BODY_ALLOWED_KEYS` thêm 2 entry; `assertStrictBoolean` cho 2 flag mới; idempotency hash array length 11 → 13. Editor shell mở rộng props 4 toggle. Public DTO chain mở rộng 2 field.
- **Migration/rollback:** Forward-only ADD-only. KHÔNG DROP column. KHÔNG RENAME. KHÔNG fabricate. Existing rows giữ false. Migration timestamp `>= 20261003000000`. Production migration = `NOT_RUN` (chỉ validate + generate trên schema mới).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Worktree setup | Tạo clean worktree `codex/t1b-ui-v1-job-card-stamps-brand` từ `origin/main@6ea2e267b72120de5f67d5954d1074101efccff1`. Sau khi T1A Mốc 2A merge, forward-merge `origin/main` (no rebase/force-push). | `git rev-parse HEAD` | Nếu baseline không khớp 40-char SHA hex → dừng |
| `STEP-02` | `prisma/schema.prisma` (additive) | Thêm `isHighReward` + `isExpiringSoon` ngay sau line 578. | `npx prisma validate`; `npx prisma generate` | Validate fail hoặc client types không có field mới |
| `STEP-03` | `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` (NEW) | ADD-only 2 BOOLEAN NOT NULL DEFAULT false. KHÔNG DROP/RENAME/CREATE FUNCTION. | `cat migration.sql` | Migration chứa DROP/RENAME |
| `STEP-04` | `src/domains/job-board/components/landing/stamp-defs.ts` | Thêm key `sap-het-han`. Update `STAMP_RANK` (4 key active + `moi` legacy). Mở rộng `deriveStampsFromFlags` 4 flag. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` | Registry/STAMP_RANK/derive lệch |
| `STEP-05` | `src/domains/job-board/components/landing/stamp-badge.tsx` | Mở rộng props `isHighReward`, `isExpiringSoon`. Update line 69 derive signature. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` | Component render sai |
| `STEP-06` | `src/domains/job-board/components/landing/featured-job-card.tsx` | Mở rộng `FeaturedJobCardProps['job']` 2 field. Caller homepage truyền đủ 4 flag. | `npm run typecheck`; code review | Caller thiếu flag |
| `STEP-07` | `src/domains/staffing/job-posting-authoring.service.ts` | `UpdateDraftContentInput` thêm 2 field. `assertBoolean` mở rộng union label 4 flag. `JobPostingModelRow` thêm 2 field. `toJobPostingDto` copy 2 field. `updateDraftContent` DB write 2 field. | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-stamps-eligibility.test.ts` | Validator/mapper/DB write sai |
| `STEP-08` | `src/domains/staffing/job-posting-list.service.ts` | `JobPostingListItemDto` + `JobPostingDetailDto` thêm 2 field. SELECT include 2 field. Mappers copy 2 field. | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-list.service.test.ts` | DTO/SELECT/mapper lệch |
| `STEP-09` | `app/api/admin/jobs/job-postings/[id]/route.ts` | `PATCH_BODY_ALLOWED_KEYS` thêm 2 entry. `assertStrictBoolean` cho 2 flag. `requestBody` length 11 → 13. | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/[id]/route.test.ts` | Hash không cover; allowlist thiếu |
| `STEP-10` | `app/api/admin/jobs/job-postings/[id]/route.test.ts` | Mở rộng matrix: false→true cho 2 flag, combinations 4 flag, omitted-undefined, invalid rejection, 409 idempotency conflict, hash stability. | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/[id]/route.test.ts` | Test fail |
| `STEP-11` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | Thêm 2 toggle `Thưởng cao` + `Sắp hết hạn`. State + snapshot + dirty check + PATCH body. DRAFT-only disabled. | `npm run typecheck`; code review | Editor không phản ánh 4 toggle |
| `STEP-12` | `app/(portal)/page.tsx` + `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx` | Homepage FeaturedJobCard caller truyền đủ 4 flag. `/viec-lam` + detail render stamp qua `JobStampBadge` 4 flag. KHÔNG tự render badge riêng. | `npm run typecheck`; code review | Caller thiếu flag; surface tự render |
| `STEP-13` | `src/domains/job-board/public.service.ts` | `PublicJobPostingSelectPayload` + `PublicProjectRow` + `PublicJobDto` thêm 2 field. Mappers copy 2 field. `publicSelect` allowlist thêm 2 key. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-detail.service.test.ts` | Mappers/allowlist drift |
| `STEP-14` | `src/domains/job-board/public-select.static.test.ts` | Allowlist update: thêm `isHighReward`, `isExpiringSoon` vào sorted top-level keys. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` | Allowlist drift |
| `STEP-15` | `public/hrp-logo.webp` (NEW asset) | Copy `C:\CodeApp\hrpartner-logo.webp` (52,334 bytes webp) qua first-class write tool. Verify file size + extension. | `Get-Item public/hrp-logo.webp` | File không tồn tại hoặc size lệch |
| `STEP-16` | `app/components/GlobalNavbar.tsx:120`, `app/login/login-form.tsx:73`, `src/shared/ui/role-guard/role-guard-layout.tsx:416` | Sweep `/logo.png` → `/hrp-logo.webp`. Alt text → `"HRP — Việc làm miền Bắc"`. | `rg "src=\"/logo.png\"" app/ src/` | Reference còn sót |
| `STEP-17` | `app/layout.tsx:5` | Default title → `"Việc làm miền Bắc - Kết nối để thành công - HRP"`. Default description update. Template giữ `'%s · HRP'`. | `Get-Content app/layout.tsx` | Default title lệch |
| `STEP-18` | `app/(portal)/ve-chung-toi/page.tsx` (delete) + folder delete | Xoá file + folder. | `Get-ChildItem app/(portal)/ve-chung-toi` | File còn sót |
| `STEP-19` | `app/components/GlobalNavbar.tsx:23` + `app/components/GlobalFooter.tsx:11` | Xoá 2 entry nav link `/ve-chung-toi`. | `rg "ve-chung-toi" app/components/` | Nav còn entry |
| `STEP-20` | `app/(portal)/page.tsx:376` comment + import (nếu có) | Verify `HrpIntroSection` còn dùng ở đâu. | `rg "HrpIntroSection" app/ src/` | Reference còn sót |
| `STEP-21` | `tests/db/job-posting-stamps.integration.test.ts` | Mở rộng 2-4 case: round-trip `isHighReward` + `isExpiringSoon` createDraft + PATCH + public projection. Tổng 13-15 cases. | `npm run test:integration` (synthetic DB READY; nếu ENV_BLOCKED ghi BLOCKED) | Test fail |
| `STEP-22` | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (nếu có) HOẶC `src/domains/job-board/job-posting-stamps-mapping.test.ts` | Mở rộng cover 4 flag → render 0/1/2/3/4 stamp theo STAMP_RANK. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` | Test fail |
| `STEP-23` | `src/domains/job-board/job-posting-stamps.static.test.ts` (nếu có) | Static fence `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` còn đúng 0.7↔1.0. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps.static.test.ts` | Static test fail |
| `STEP-24` | Canonical gates | `npx prisma validate`, `npx prisma generate`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run build`, `git diff --check`, `pwsh .ai-pipeline/scripts/verify-encoding.ps1`, `pwsh .ai-pipeline/scripts/verify-task.ps1`, `pwsh .ai-pipeline/scripts/verify-handoff.ps1`. | tất cả AC | Gate fail |
| `STEP-25` | F8 forward-merge | Sau khi T1A Mốc 2A merge vào `main`, `git fetch origin` + `git merge --no-ff origin/main` (no rebase, no force-push). Nếu T1A cung cấp shared safe error mapper, consume trong `editor-shell.tsx`. | `git log --oneline --merges`; code review | Forward-merge conflict chưa resolve; mapper thứ hai xuất hiện |
| `STEP-26` | Commit + HANDOFF | Commit semantic implementation (1 commit). Write HANDOFF.md. Re-run `verify-handoff`. Freeze docs commit. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1` | HANDOFF không pin exact Implementation SHA |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `npx prisma validate` xanh; `npx prisma generate` không lỗi; `JobPosting.isHighReward` + `JobPosting.isExpiringSoon` xuất hiện trong `node_modules/.prisma/client/index.d.ts`. | `npx prisma validate`; `npx prisma generate`; `Select-String "isHighReward\|isExpiringSoon" node_modules/.prisma/client/index.d.ts` |
| `AC-02` | Migration `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` chỉ chứa 2 `ALTER TABLE "job_postings" ADD COLUMN "is_high_reward"/"is_expiring_soon" BOOLEAN NOT NULL DEFAULT false`; không DROP/RENAME/CREATE FUNCTION. | `Get-Content migration.sql`; `Select-String -Pattern "DROP\|RENAME\|CREATE FUNCTION" migration.sql` exit 1 (no match) |
| `AC-03` | `STAMPS` registry có 5 key: `tuyen-gap`, `hot`, `sap-het-han`, `thuong-cao`, `moi`. `STAMP_RANK` đúng order. `STAMP_KEYS` khớp registry keys. | `Select-String -Pattern "^  '[a-z-]+':" src/domains/job-board/components/landing/stamp-defs.ts \| Measure-Object` (count = 5) |
| `AC-04` | `deriveStampsFromFlags(false, false, false, false)` → `[]`. `(true, false, false, false)` → `['hot']`. `(false, true, false, false)` → `['tuyen-gap']`. `(false, false, true, false)` → `['thuong-cao']`. `(false, false, false, true)` → `['sap-het-han']`. `(true, true, true, true)` → `['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao']`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` (must exit 0) |
| `AC-05` | `JobStampBadge` với 4 flag = `false` → render `null`. Với 1 flag `true` → render 1 span. Với 4 flag `true` → render 4 span sorted theo STAMP_RANK. Mỗi span có `aria-label` + `data-stamp-key` + `data-stamp-index` + className `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (must exit 0) |
| `AC-06` | `FeaturedJobCard` với job có cả 4 flag `true` → `RubberStamp` render 4 stamp theo STAMP_RANK. Caller `app/(portal)/page.tsx` truyền đủ 4 flag từ enriched job. | `npm run typecheck` (must exit 0); code review; `npm run build` (must exit 0) |
| `AC-07` | `updateDraftContent` reject payload có `isHighReward: 'true'` (string) → `INVALID_INPUT 400`. Reject `isExpiringSoon: null` không hợp lệ (chỉ chấp nhận `true`/`false`/`undefined`) → `INVALID_INPUT 400`. Validator `assertBoolean` mở rộng union label 4 flag. | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-stamps-eligibility.test.ts` (must exit 0) |
| `AC-08` | `JobPostingModelRow` interface có `isHighReward: boolean` + `isExpiringSoon: boolean`. `toJobPostingDto` mapper copy cả 2 field. DB write trong `updateDraftContent` thêm 2 field vào `data` object. | `Select-String -Pattern "isHighReward\|isExpiringSoon" src/domains/staffing/job-posting-authoring.service.ts` (must include `data:` and `row.`) |
| `AC-09` | PATCH route: `PATCH_BODY_ALLOWED_KEYS` Set có 9 entry (7 cũ + 2 mới). `assertStrictBoolean(body.isHighReward)` + `assertStrictBoolean(body.isExpiringSoon)` reject non-boolean. `requestBody` array length 13. | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/[id]/route.test.ts` (must exit 0); `Select-String -Pattern "requestBody" app/api/admin/jobs/job-postings/[id]/route.ts` |
| `AC-10` | Editor shell có 4 toggle: `Hot`, `Tuyển gấp`, `Thưởng cao`, `Sắp hết hạn`. State + snapshot + dirty check + PATCH body. Disabled khi `status !== 'DRAFT'`. Click → bật dirty; PATCH body chứa đủ 4 flag; save 200; revision bump; status giữ nguyên. | `npm run typecheck` (must exit 0); `npm run build` (must exit 0); manual smoke |
| `AC-11` | `JobPostingListItemDto` + `JobPostingDetailDto` có `isHighReward: boolean` + `isExpiringSoon: boolean`. SELECT include cả 2 field. Mappers copy cả 2. | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-list.service.test.ts` (must exit 0); `Select-String -Pattern "isHighReward\|isExpiringSoon" src/domains/staffing/job-posting-list.service.ts` |
| `AC-12` | `PublicJobPostingSelectPayload` + `PublicProjectRow` + `PublicJobDto` thêm 2 field. Mappers `toDto`/`toDetailDto`/`projectRowFromPosting` copy 2 field. `publicSelect` allowlist thêm 2 key. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-detail.service.test.ts` (must exit 0); `Select-String -Pattern "isHighReward\|isExpiringSoon" src/domains/job-board/public.service.ts` |
| `AC-13` | `src/domains/job-board/public-select.static.test.ts` allowlist đã update với `isHighReward`, `isExpiringSoon` ở sorted position. Test xanh. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/public-select.static.test.ts` (must exit 0) |
| `AC-14` | `app/api/admin/jobs/job-postings/[id]/route.test.ts` matrix cover 4 flag: false→true cho 2 flag mới, combinations 4 flag, omitted-undefined, invalid rejection (NULL/string/number/object), 409 idempotency conflict, hash stability. | `npx vitest run --config vitest.unit.config.ts app/api/admin/jobs/job-postings/[id]/route.test.ts` (must exit 0) |
| `AC-15` | `public/hrp-logo.webp` tồn tại, 52,334 bytes, extension `.webp`. `git status` track file. | `Get-Item public/hrp-logo.webp` (Length=52334 Extension=.webp) |
| `AC-16` | `Select-String -Path app/ -Pattern "src=\"/logo.png\"" -Recurse` → 0 hit. `Select-String -Path src/shared/ui/role-guard/role-guard-layout.tsx -Pattern "logo.png"` → 0 hit. 3 reference swept sang `/hrp-logo.webp`. Alt text → `"HRP — Việc làm miền Bắc"`. | `Select-String -Path app/ -Pattern "src=\"/logo.png\"" -Recurse` (must exit 1) |
| `AC-17` | `app/layout.tsx` `metadata.title.default === 'Việc làm miền Bắc - Kết nối để thành công - HRP'`. Template `'%s · HRP'` giữ nguyên. Description update. | `Select-String -Path app/layout.tsx -Pattern "default: 'Việc làm miền Bắc"` (must match 1) |
| `AC-18` | `app/(portal)/ve-chung-toi/` folder không tồn tại. `app/components/GlobalNavbar.tsx:23` không còn entry `/ve-chung-toi`. `app/components/GlobalFooter.tsx:11` không còn entry. `ve-hrp.html` còn nguyên. | `Test-Path app/(portal)/ve-chung-toi` (must be False); `Select-String -Path app/components/GlobalNavbar.tsx -Pattern "ve-chung-toi"` (must exit 1); `Test-Path ve-hrp.html` (must be True) |
| `AC-19` | `Select-String -Path app/ -Pattern "ve-chung-toi\|VeChungToiPage\|Về HRP Việt Nam" -Recurse` → 0 hit NGOẠI TRỪ `ve-hrp.html` (legal/policy) và history evidence. | `Select-String -Path app/ -Pattern "ve-chung-toi\|VeChungToiPage\|Về HRP Việt Nam" -Recurse` (must exit 1) |
| `AC-20` | `tests/db/job-posting-stamps.integration.test.ts` mở rộng 2-4 case cho `isHighReward` + `isExpiringSoon` round-trip + public projection. Tổng 13-15 cases. Test xanh trên synthetic DB. | `npm run test:integration` (synthetic DB READY; nếu ENV_BLOCKED ghi BLOCKED) |
| `AC-21` | `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (hoặc `src/domains/job-board/job-posting-stamps-mapping.test.ts`) cover 4 flag → 0/1/2/3/4 stamp render đúng STAMP_RANK. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` (must exit 0) |
| `AC-22` | `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` còn đúng opacity 0.7↔1.0 + `motion-reduce:animate-none motion-reduce:opacity-100`. | `Select-String -Path app/globals.css -Pattern "@keyframes job-stamp-blink\|motion-reduce:animate-none"` (must match both) |
| `AC-23` | F8 forward-merge: nếu T1A Mốc 2A đã merge, worktree đã forward-merge `origin/main`. Nếu T1A cung cấp shared safe error mapper, `app/admin/jobs/job-postings/[id]/editor-shell.tsx:83` consume mapper đó; KHÔNG tạo mapper thứ hai. | `git log --oneline --merges` (chứa merge commit origin/main); `Select-String -Path app/admin/jobs/job-postings/[id]/editor-shell.tsx -Pattern "readErrorMessage"` (verify single import) |
| `AC-24` | HANDOFF.md pin đúng semantic Implementation SHA. `verify-handoff.ps1` PASS. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md` (must exit 0) |
| `AC-25` | `npm run typecheck` exit 0. `npm run lint` exit 0. `npm run test:unit` exit 0. `npm run build` exit 0. `git diff --cached --check` exit 0. `pwsh .ai-pipeline/scripts/verify-encoding.ps1` exit 0. | `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run build`; `git diff --cached --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-02` | `AC-01` |
| `RQ-03` | `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-04` | `AC-03`, `AC-04` |
| `RQ-05` | `STEP-04` | `AC-04` |
| `RQ-06` | `STEP-05` | `AC-05` |
| `RQ-07` | `STEP-06` | `AC-06` |
| `RQ-08` | `STEP-07` | `AC-07`, `AC-08` |
| `RQ-09` | `STEP-07` | `AC-08` |
| `RQ-10` | `STEP-09` | `AC-09` |
| `RQ-11` | `STEP-11` | `AC-10` |
| `RQ-12` | `STEP-08` | `AC-11` |
| `RQ-13` | `STEP-13` | `AC-12` |
| `RQ-14` | `STEP-13`, `STEP-14` | `AC-12`, `AC-13` |
| `RQ-15` | `STEP-15`, `STEP-16` | `AC-15`, `AC-16` |
| `RQ-16` | `STEP-17` | `AC-17` |
| `RQ-17` | `STEP-18`, `STEP-19`, `STEP-20` | `AC-18`, `AC-19` |
| `RQ-18` | `STEP-18` | `AC-18` |
| `RQ-19` | `STEP-25` | `AC-23` |
| `RQ-20` | `STEP-05`, `STEP-12` | `AC-05`, `AC-06` |
| `RQ-21` | `STEP-04`, `STEP-05`, `STEP-23` | `AC-03`, `AC-05`, `AC-22` |
| (test cover) | `STEP-10`, `STEP-21`, `STEP-22`, `STEP-23` | `AC-14`, `AC-20`, `AC-21`, `AC-22` |
| (canonical gates) | `STEP-24` | `AC-25` |
| (commit + HANDOFF freeze) | `STEP-26` | `AC-24` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Migration timestamp collision: nếu Tier 1 dùng timestamp trùng migration khác (e.g. T1A Mốc 2A nếu merge trong cùng round). | Trước khi mkdir, `Get-ChildItem prisma/migrations -Directory \| Sort-Object Name` kiểm tra latest; dùng `20261004120000_ui_v1_jobposting_stamp_flags` (strictly greater than `20260930090000_p1a05_hr_staff_job_openings_update_rls` và an toàn trước `20261004000000_f9b_r2_slot_scope_read_restore` mà T0 đã đánh dấu là production-bound). |
| `RISK-02` | `assertBoolean` validator không mở rộng union label đầy đủ → 2 flag mới bị silently accept mọi type. | `npx vitest run --config vitest.unit.config.ts src/domains/staffing/job-posting-stamps-eligibility.test.ts` (AC-07). |
| `RISK-03` | Idempotency hash không cover 2 flag mới → silent replay sai trạng thái. | `requestBody` array length 13 verify bằng test idempotency conflict (AC-09, AC-14). |
| `RISK-04` | `publicSelect` allowlist drift → static test fail. | Update allowlist cùng commit. Test xanh trước freeze (AC-13). |
| `RISK-05` | `HrpIntroSection` reference ở `app/(portal)/page.tsx:376` (comment) — nếu component chỉ serve About page mà Tier 1 quên dọn import hoặc homepage reference, có thể gây TypeScript error sau khi xoá. | `Select-String -Path app/ -Pattern "HrpIntroSection\|VeChungToiPage" -Recurse` (AC-19); nếu chỉ dùng ở About page đã xoá, dọn import. |
| `RISK-06` | Logo sweep bỏ sót `/logo.png` reference ở surface khác. | `Select-String -Path app/ -Pattern "src=\"/logo.png\"" -Recurse` (AC-16). |
| `RISK-07` | F8 forward-merge: nếu T1A Mốc 2A chưa merge khi T1B start, T1B phải đợi. Nếu T1A cung cấp shared safe error mapper nhưng Tier 1 quên consume → 2 mapper tồn tại. | Forward-merge ngay khi T1A Mốc 2A vào main (AC-23). |
| `RISK-08` | T1A editor schema hotfix (T1A ownership) đang hotfix `JobPostingRichTextEditor`; nếu T1B start trước khi T1A merge, conflict ở `app/admin/jobs/job-postings/[id]/editor-shell.tsx` có thể xảy ra. | T0 §"Có thể khảo sát và triển khai song song với T1A, nhưng trước final freeze phải forward-merge latest main sau khi Mốc 2A của T1A merge. Không rebase/force-push." → forward-merge sau T1A Mốc 2A. |
| `RISK-09` | Stamp offset index trên mobile gây horizontal overflow. | Visual test trên viewport 375px; mỗi stamp wrapper giữ `-top-2 -left-2` + index offset; verify card width không vượt viewport. |
| `RISK-10` | `STAMP_RANK` reorder gây rank confusion nếu Tier 1 quên update comment trong `stamp-defs.ts`. | `npx vitest run --config vitest.unit.config.ts src/domains/job-board/job-posting-stamps-mapping.test.ts` (AC-04). |

## 8. Open Questions

- None. T0 directive §1-§4 đã chốt toàn bộ Owner decisions: 4 toggle flags, forward-only additive migration với default false, brand asset từ `C:\CodeApp\hrpartner-logo.webp`, default metadata title chính xác, xoá `/ve-chung-toi` + 2 nav link, F8 forward-merge từ T1A Mốc 2A, **Audit = LIGHT, Lane = CRITICAL** (T0 §A override), correction budget = 1, **migration timestamp = `20261004120000_ui_v1_jobposting_stamp_flags`** (T0 §B), **T1B ownership của `editor-shell.tsx`** (T0 §C).

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | T0 directive đã chốt đủ Owner decisions; contract READY_TO_CODE. Tier 1 tự review 3 rủi ro trọng yếu (idempotency hash, publicSelect allowlist, F8 forward-merge) trước freeze. | T0 §1-§4 đầy đủ. Tier 1 không cần hỏi thêm. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-04` | Initial TASK.md authored. Baseline `6ea2e267b72120de5f67d5954d1074101efccff1` (latest origin/main). Status `READY_FOR_EXECUTION`. Contract gate `READY_TO_CODE`. Audit `NONE`. Correction budget `1`. 4 toggle flags (Hot/Tuyển gấp/Thưởng cao/Sắp hết hạn) reuse `STAMPS` registry + `JobStampBadge` + `FeaturedJobCard` pattern. Forward-only migration với default false. Brand asset `public/hrp-logo.webp` copy từ Owner-provided `C:\CodeApp\hrpartner-logo.webp`. Default metadata title `"Việc làm miền Bắc - Kết nối để thành công - HRP"`. Xoá `app/(portal)/ve-chung-toi/` + 2 nav link. F8 forward-merge từ T1A Mốc 2A. | T0 directive 2026-10-03/04 chốt outcome/boundary/lane/audit. |
| `v1.1` | `2026-10-04` | T0 §A contract correction: Lane `STANDARD` → `CRITICAL`, Audit `NONE` → `LIGHT`, Next gate `TIER3_LIGHT_AUDIT`. T0 §B migration identity: timestamp `20261003120000_t1b_jobposting_stamps_brand` → `20261004120000_ui_v1_jobposting_stamp_flags` (strictly greater than latest migration `20260930090000_p1a05_hr_staff_job_openings_update_rls`, an toàn trước `20261004000000_f9b_r2_slot_scope_read_restore` mà T0 liệt kê). T0 §C file ownership: explicit T1B sở hữu `app/admin/jobs/job-postings/[id]/editor-shell.tsx`. AC-02/STEP-03/RISK-01/DEC-01/RQ-01/§1.1.3 sweep sang migration name mới. Re-verify `verify-task.ps1` PASS 14/14. | T0 directive 2026-10-04 §A, §B, §C override. |
