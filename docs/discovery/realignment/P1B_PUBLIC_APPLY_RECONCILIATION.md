# P1-B Public Apply Reconciliation

| Field | Value |
|---|---|
| Spec version | v1.2 |
| Decision state | CHOSEN (T0 chốt toàn bộ OD-P1B-* theo C-06; §9 không còn Open Questions) |
| Status | PROPOSED_ONLY |
| Next gate | `WAIT_P1_A1_ACCEPTED` |
| Contract gate | `DRAFT` (T1B prepares this under V2 fast-freeze; correction batch C-01..C-08 đã đóng) |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` (`origin/main` at T0 assignment) |
| Delivery protocol | V2_FAST_FREEZE |
| Correction budget | 1 |
| Test environment | NOT_REQUIRED (round này documentation-only; chưa chạm code/test/runtime) |
| Planner | Tier 1B (T1B) |
| Predecessor | `docs/discovery/realignment/P1A_JOBPOSTING_MARKETPLACE_RECONCILIATION.md` v1.2 (`b34cdddd…`) |
| Depends on | P1-A0 ACCEPTED (proven at `c4418bb9…`) + P1-A1 ACCEPTED |
| Scope lần này | Documentation-only; KHÔNG code, KHÔNG install, KHÔNG migration, KHÔNG schema, KHÔNG PR |

## 1. Mục đích

Khảo sát và phân loại rõ hiện trạng của Public Apply pipeline (read territory = canonical `/api/public/jobs/[slug]/applications`, write boundary = SECURITY DEFINER `hrp_public_apply_submission` / `hrp_public_intake_submission` cùng các writer services), từ đó chốt **dependency boundary** giữa **P1-A1** (do T1A triển khai) và **P1-B** (do T1B lập kế hoạch execution), cũng như chốt **phạm vi thin-slice execution** mà P1-B sẽ thực hiện trong round kế tiếp.

Khảo sát dựa trên `prisma/schema.prisma`, migration `20260823101500_mp2_apply_tracking` (RPC `hrp_public_apply_submission`), migration `20260919100000_aff03b_public_intake_rpc` (RPC `hrp_public_intake_submission`), source code trong `src/domains/applications/**`, `src/domains/talent/**`, `src/shared/security/**`, `src/shared/integrity/**`, các route handler trong `app/api/public/**` cùng các static tests trong `src/domains/applications/marketplace-*.static.test.ts` và integration tests trong `tests/db/aff03-public-intake.integration.test.ts`. Mọi evidence là file:line cụ thể, không suy luận ngoài mã nguồn.

Bản này v1.0 là initial planning; v1.1+ là T0 contract correction batch (nếu có) sau khi T0 review.

## 2. Capability Matrix Hiện Tại

### 2.1 Phạm vi Public Apply (anon N1 path)

| ID | Capability / Bề mặt | Status | Bằng cớ (File path / Model) |
|---|---|---|---|
| `CAP-01` | Canonical Public Detail (JobPosting PUBLISHED → React DOM) | **A1_TERRITORY_OWNED** | `src/domains/job-board/public.service.ts:705` (`getPublicJobDetail` + `getPublicJobProjection`); `app/(jobs)/viec-lam/**`. P1-A0 tạo `PUBLISHED JobPosting` schema state; **P1-A1** sở hữu public read path qua JobPosting; **P1-B KHÔNG sửa** bề mặt này. |
| `CAP-02` | Legacy anon apply route `/api/jobs/apply` | IMPLEMENTED (RETIRED) | `app/api/jobs/apply/route.ts` = deterministic 410 `retiredApplyEndpointResponse()`; xem `src/shared/security/retired-endpoint.ts` `CANONICAL_APPLY_PATH_TEMPLATE` = `/api/public/jobs/[slug]/applications`. **P1-B KHÔNG mở lại**. |
| `CAP-03` | Canonical anon apply route `POST /api/public/jobs/[slug]/applications` | IMPLEMENTED (legacy MP-2 RPC) | `app/api/public/jobs/[slug]/applications/route.ts`; `submitPublicApplication` ở `src/domains/applications/application.service.ts:117`. Đang ủy quyền toàn bộ write chain cho `hrp_public_apply_submission` (`prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` lines ~80–199). **Bề mặt chính mà P1-B tiếp quản.** |
| `CAP-04` | Canonical anon apply route `POST /api/public/intake` (AFF-03B) | IMPLEMENTED (RIÊNG BIỆT) | `app/api/public/intake/route.ts`; `submitPublicIntake` ở `src/domains/applications/aff03-public-intake.service.ts`; RPC `hrp_public_intake_submission` ở migration `20260919100000_aff03_b_public_intake_rpc`. Đây là **public anon N1 apply theo recruitment/affiliate channel** (signed `hrp_aff` cookie), KHÔNG trùng với job-scope apply ở CAP-03. **P1-B KHÔNG tạo đường song song hay cố gắng merge hai tuyến.** Tuyến này là chứng minh "create-or-match LaborProfile + open PlacementCase" đã chạy đúng cho worker, mà P1-B sẽ học/kế thừa cho slug-bound job apply. |
| `CAP-05` | `CandidateSubmission` table | IMPLEMENTED | `prisma/schema.prisma` `model CandidateSubmission` (mục lục `candidate_submissions`): PK `id`, FK nullable `laborProfileId` (FK ON DELETE RESTRICT), FK nullable `placementCaseId` (FK ON DELETE RESTRICT), `projectId`, `slotId`, normalized PII (`normalized_phone`, `full_name`, `cccd_number`, `date_of_birth`, `gender`, `experience`), CV metadata, `public_tracking_code`, `idempotency_key_hash`, `idempotency_payload_hash`, `status ∈ {NEW, NEEDS_INFO, SCREENING, QUALIFIED, REJECTED, WITHDRAWN, CONVERTED}`, audit fields (`vendor_id`, `ctv_id` null cho anon). **KHÔNG có cột `jobPostingId`** (OD-P1A-09 đã chốt: nếu cần persisted attribution tới JobPosting phải mở task additive riêng sau P1-A1 — **P1-B chưa mở cột đó**). |
| `CAP-06` | `Application` table (legacy / non-anon internals) | IMPLEMENTED (NHƯNG TÁCH) | Schema `model Application` là một bảng tách với lifecycle nội bộ (staff/affiliate intake từ `/api/admin/intake/staff`, recruiter CRM…). **KHÔNG dùng cho public anon apply** của P1 chain; `CandidateSubmission` là bảng dành cho P1-B public apply. |
| `CAP-07` | `LaborProfile` table + scoring rule + create-or-match | IMPLEMENTED | `prisma/schema.prisma` `model LaborProfile`; `src/domains/talent/labor-profile.service.ts` chứa `scoreAndClassify` (`≥2-signal EXACT_MATCH`, otherwise `POSSIBLE_MATCH`/`NEW_PROFILE`), `createOrMatchLaborProfile`. Mirror PL/pgSQL có sẵn ở RPC `hrp_public_intake_submission` (DEC-11). |
| `CAP-08` | `PlacementCase` table + partial unique index (`placement_case_labor_profile_id_active_unique`) | IMPLEMENTED | `prisma/schema.prisma` `model PlacementCase`; index partial unique ở migration gốc N2-2 (`status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')` per `LaborProfile`). `openPlacementCase` ở `src/domains/talent/placement-case.service.ts` dùng savepoint để chống race. **Có sẵn để P1-B cắm vào.** |
| `CAP-09` | RPC `hrp_public_apply_submission` (anon apply, slug-based, MP-2 era) | IMPLEMENTED (PARTIAL — KHÔNG cắm LaborProfile / PlacementCase) | `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` lines ~80–199. Function signature `(p_slug text, p_slot_id text, p_full_name text, p_phone text, p_normalized_phone text, p_cccd text, p_dob date, p_gender text, p_experience text, p_consent_at timestamptz, p_cv_file_name text, p_cv_mime_type text, p_cv_size_bytes int, p_cv_storage_key text, p_idempotency_key_hash text, p_idempotency_payload_hash text, p_tracking_code text)`. **Quy trình hiện tại chỉ INSERT `candidate_submissions` (vendor_id=NULL, ctv_id=NULL) + INSERT `application_status_history` (NULL→'NEW', reason='PUBLIC_APPLY'); KHÔNG gọi PL/pgSQL score-and-classify, KHÔNG INSERT `labor_profiles`, KHÔNG INSERT `placement_cases`, KHÔNG verify JobPosting.status hay JobOpening.status.** Đây là điểm P1-B khắc phục. |
| `CAP-10` | RPC `hrp_public_intake_submission` (anon N1 recruitment path, AFF-03B) | IMPLEMENTED (REFERENCE) | Migration `20260919100000_aff03b_public_intake_rpc`. Function đã chạy mirror PL/pgSQL `scoreAndClassify`, INSERT `labor_profiles` (NEW_PROFILE), INSERT `placement_cases`, INSERT `candidate_submissions` (vendor_id=NULL, ctv_id=NULL per DEC-13), resolve attribution qua `referral_attributions` (DB-level guard: `status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL`), INSERT `labor_profile_handling_assignments` (source='AFF_INITIAL'). **Function signature KHÁC** `hrp_public_apply_submission`: `(p_payload jsonb)` chứ không phải long-param list. Migration AFF-03C `20260921140000_aff03c_cs_labor_profile_backfill` backfill + sửa INSERT `candidate_submissions.labor_profile_id = v_lp_id`. **Đây là reference runtime path đã chứng minh LaborProfile + PlacementCase create chain chạy đúng qua SECURITY DEFINER.** |
| `CAP-11` | Project/JobOpening/JobPosting/Slot server-derived binding | PARTIAL | T1A (`hrp-p1-a1-canonical-public-job-detail`) sở hữu việc thay body `hrp_public_apply_submission` để derive server-side `JobPosting.slug` → resolve `PUBLISHED` JobPosting → validate linked `JobOpening.status='OPEN'` → derive canonical slot, atomic trong cùng SECURITY DEFINER transaction (DEC-10/DEC-11 trong P1-A1). **Hiện** body function `hrp_public_apply_submission` chỉ resolve `Project.is_public=true + Project.status='ACTIVE' + StaffingOrder.status IN ('OPEN','CLOSING_SOON')` + slot theo slug; đây là author legacy MP-2. **P1-A1** sẽ thay body này; **P1-B** KHÔNG đụng vào signature/owner/grants/search_path. P1-B phụ thuộc downstream của A1: khi A1 đã đổi body thì A1 sẽ nhận `JobPosting`/`JobOpening` ở cùng transaction. |
| `CAP-12` | Public RPC ownership / grants / search_path / RLS | IMPLEMENTED | Migration `20260823101500_mp2_apply_tracking` lines ~226–258: `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE ... TO app_user_writer, app_user`; `OWNER TO hrp_public_rpc`; `SET search_path = public, pg_temp`; `STABLE`/`SECURITY DEFINER`. Table grants tối thiểu (`SELECT,INSERT candidate_submissions`; `SELECT,INSERT application_status_history`; `SELECT` trên các bảng tham chiếu). RPC `hrp_public_intake_submission` ở AFF-03B giữ cùng ownership/grants/search_path (theo DEC-14). **P1-B mở rộng table grants tối thiểu cho `labor_profiles`, `placement_cases`, `referral_attributions`, etc. theo nhu cầu insert/update với cùng role `hrp_public_rpc` — KHÔNG bypass qua app_user, KHÔNG thay đổi role/owner.** |
| `CAP-13` | Idempotency — replay/duplicate/concurrency | IMPLEMENTED (legacy MP-2) + IMPLEMENTED (writer service `withIdempotency`) | (a) RPC `hrp_public_apply_submission` triển khai replay ở DB-level: SELECT `candidate_submissions.idempotency_key_hash` → nếu `idempotency_payload_hash` khác → `P0010 IDEMPOTENCY_PAYLOAD_MISMATCH`; nếu khớp → trả stored `tracking_code` + `status`; INSERT có `EXCEPTION WHEN unique_violation` re-check idempotency row → nếu cùng payload → replay, nếu khác payload → `P0012 DUPLICATE_APPLICATION`. (b) Helper `withIdempotency` ở `src/shared/integrity/idempotency/**` (qua bảng `idempotency_keys`) cho non-RPC path (`app/api/public/intake` đã wrap `withIdempotency`). **P1-B sẽ wrap service bằng `withIdempotency` cho route mới**, giữ DB-level guard trong RPC như lớp defense-in-depth, và bổ sung P1-A1 nếu chưa có race check cho PUBLISHED/OPEN atomicity. |
| `CAP-14` | Duplicate application guard (slot + normalized_phone) | IMPLEMENTED | RPC `hrp_public_apply_submission` lines ~151–157: nếu có row `cs.slot_id = v_slot_id AND cs.normalized_phone = p_normalized_phone AND cs.status NOT IN ('REJECTED','WITHDRAWN')` → `P0012 DUPLICATE_APPLICATION`. **P1-B phải giữ invariant này**; route map sang HTTP 409. RPC AFF-03B có guard tương tự qua LaborProfile `scoreAndClassify` (EXACT_MATCH → reuse, không tạo row mới). |
| `CAP-15` | Attribution / source preservation (referral/aff cookie) | IMPLEMENTED (TÁCH) | `src/domains/referrals/**` (`verifyAttributionToken`), bảng `referral_attributions`, `app/api/public/intake` đọc signed `hrp_aff` cookie. **P1-B KHÔNG mở attribution ở slug-bound apply trong round này** — Owner chưa chốt policy chung cho slug-bound apply (xem §6 Open Decisions). Khi A1 RPC đã cho `jobId/slotId` từ `PUBLISHED JobPosting + OPEN JobOpening`, attribution (nếu sau này muốn) sẽ qua cùng cơ chế cookie → DB-level guard; **P1-B không tự ý thêm cột/field ở slug-bound apply**. Cần task additive riêng cho slug-bound apply + referral attribution sau P1-B. |
| `CAP-16` | Anti-abuse: rate-limit (IP + phone) | IMPLEMENTED | `RATE_LIMIT_RULES.APPLY_IP` (20/60s, IP-based), `RATE_LIMIT_RULES.APPLY_PHONE` (10/60s, normalized phone). Provider port/adapter ở `src/shared/security/rate-limit-port/**` với Upstash Redis (prod) + memory fallback (dev). DUAL bucket cho tracking endpoint: `RATE_LIMIT_RULES.TRACKING_IP` + `RATE_LIMIT_RULES.TRACKING_CODE` (HMAC). **P1-B reuse nguyên guard.** |
| `CAP-17` | Anti-abuse: request body capping (16 KiB) + media-type gate + shape chặt + CV non-null 422 | IMPLEMENTED | `src/shared/security/request-body.ts` `readCappedJson` (default `APPLY_MAX_BODY_BYTES = 16 KiB`); route `app/api/public/jobs/[slug]/applications/route.ts` lines ~30–72 define `ACCEPTED_FIELDS`/`STRING_FIELDS` shape gate; CV-gate `body.cv !== null → 422 CV_UPLOAD_DISABLED`. **P1-B reuse `readCappedJson`; KHÔNG rebuild shape gate; KHÔNG mở CV upload.** |
| `CAP-18` | Validation: Zod vs hand-crafted shape guards | IMPLEMENTED (BOTH) | Route hiện dùng **hand-crafted** shape guards (`shapeViolation` ở applications route); AFF-03B route dùng Zod schema trong service. **P1-B dùng hand-crafted shape guards** (đồng nhất với A1 choice; A1 task §4.2 chốt): fast 5-field roster, không cần Zod cho thin slice. KHÔNG cài package mới. |
| `CAP-19` | Zero-PII logging trong telemetry/console | IMPLEMENTED | `src/shared/observability/logger.ts` structured sink; `hrp_aff` cookie value KHÔNG log; chỉ coarse `attributionBound` flag (`src/domains/applications/aff03-public-intake.service.ts` lines ~278–279); AFF-03C hotfix confirm `CandidateSubmission.laborProfileId` được log qua structured fields. **P1-B KHÔNG log raw fullName/phone/cccd**; chỉ `route`/`outcome`/`correlationId` + `actorId`/`verdict`. |
| `CAP-20` | Tracking projection (`hrp_public_tracking_profile` / `getPublicTracking`) + masking | IMPLEMENTED | `src/domains/applications/application.service.ts` `getPublicTracking` lines ~199–236; `maskPhone` + `maskCccd` ở `src/shared/privacy/mask`. Route `GET /api/public/applications/[trackingCode]` `app/api/public/applications/[trackingCode]/route.ts` dual-bucket limit + 404 generic (no row-existence signal). **P1-B KHÔNG đụng read side** — chỉ verify rằng `CandidateSubmission` row mới do P1-B pipeline vẫn tương thích field shape (id, public_tracking_code, status, created_at, full_name; left join staffing_order_slots + outsourcing_projects). |
| `CAP-21` | Status history append-only + initial `NULL → 'NEW'` reason='PUBLIC_APPLY' | IMPLEMENTED | RPC `hrp_public_apply_submission` INSERT `application_status_history (id, submission_id, from_status, to_status, actor_user_id, reason, created_at)` values (gen_random_uuid()::text, v_new_id, NULL, 'NEW', NULL, 'PUBLIC_APPLY', v_now). **P1-B giữ được invariant này** cho slug-bound apply; bổ sung (nếu Owner chốt) initial reason tương đương `'PUBLIC_APPLY'` qua slug. |
| `CAP-22` | Public browse + browse rate-limit (JOB_BROWSE shared bucket) | IMPLEMENTED (T1A-OWNED) | `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts`, `RATE_LIMIT_RULES.JOB_BROWSE` chia sẻ cho list + detail. **Ngoài phạm vi P1-B**; T1A sở hữu. |
| `CAP-23` | Static tests guarding security boundaries | IMPLEMENTED | `src/domains/applications/marketplace-inventory.static.test.ts`: AST/string detector đảm bảo rate-limit trước DB, dual-bucket tracking, single canonical apply route, retired stub `/api/jobs/apply`. **P1-B mở rộng** static test tương ứng khi đổi route/service. |
| `CAP-24` | Integration test infra (Neon container-DB) | IMPLEMENTED | `tests/db/aff03-public-intake.integration.test.ts` đã hiện ENV_BLOCKED guard, runtime-role lane không set `app.role` GUC (AC cho 42501 bug tái hiện production). `tests/db/job-posting-authoring.integration.test.ts` cover schema A0. **P1-B integration test** = `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (synthesizes PUBLISHED JobPosting + OPEN JobOpening + CandidateSubmission.expectedRows). |
| `CAP-25` | `withPublicDb` helper (read principal) và writer default role | IMPLEMENTED | `src/shared/auth/with-public-db.ts` set `app.role = PUBLIC_READ_PRINCIPAL` + `app.settings.read_only = on` cho listing/detail; route apply không gọi helper (anon write transaction của HRP là writer default). **P1-B không cần helper mới.** |
| `CAP-26` | Job applicant name in 2026 Public Apply pipeline | IMPLEMENTED (canonical Public Markeptlace path) | `app/api/public/jobs/[slug]/applications/route.ts` đã nhận `fullName`, `phone`, `cccdNumber?`, `dateOfBirth?`, `gender?`, `experience?`, `consentAt?`. **P1-B KHÔNG đổi field roster** (giữ mapping A1 §RQ-08; không thêm/sửa field vì package/schema freeze). Synthetic applicant OK; CCCD thật KHÔNG là coding gate. |

### 2.2 Phạm vi Lifecycle / Recruitment (CRM, internal)

Khảo sát để chứng minh ranh giới P1-B ↔ P1-C/P1-D trong §3.

| ID | Capability | Status | Bằng cớ |
|---|---|---|---|
| `CAP-27` | `nextStep` projection (Manager review inbox, screening) | IMPLEMENTED (ngoài public apply) | `src/domains/applications/application.service.ts` `labelFor` chỉ map status enum → tiếng Việt. Lifecycle threading (screening, conversion) thuộc P1-C/D. |
| `CAP-28` | CRM `cases` / `tasks` / review notes | IMPLEMENTED (TÁCH BỀ MẶT) | `prisma/schema.prisma` `model Case*`, `model ApplicantNote`; migration `cases*` stack. **Ngoài P1-B.** |
| `CAP-29` | `Worker` / `SourceClaim` creation for non-anon flows | IMPLEMENTED (non-anon) | Service writer tạo `Worker` từ on-the-clock flow; **public apply KHÔNG bao giờ** tạo Worker/SourceClaim (DEC-01 legacy). P1-B giữ invariant. |
| `CAP-30` | Conversion to Worker + Case closed (PLACED) | IMPLEMENTED (P1-C/D territory) | AFF-04* migration family. P1-B KHÔNG mở. |

## 3. Phạm vi ranh giới (Boundary) A1 ↔ B

### 3.1 Phụ thuộc A1 → B

P1-A1 (T1A đang triển khai) có đặc quyền owner đối với:

1. **Public read** của `JobPosting` (DRAFT/ARCHIVED → 404, NO_LEAK), `app/(jobs)/viec-lam/**`, `src/domains/job-board/public.service.ts`.
2. **Server-side binding** từ `JobPosting.slug` → `PUBLISHED JobPosting` + linked `OPEN JobOpening` + canonical slot, trong cùng SECURITY DEFINER transaction atomic (DRAFT/ARCHIVED → từ chối, FILLED/CANCELLED → từ chối, slot ngoài opening → từ chối). Function-body migration `hrp_public_apply_submission` đã được A1 cam kết giữ exact signature/owner/grants/search_path (RQ-08 + DEC-10).
3. **Route shape** `app/api/public/jobs/[slug]/applications/route.ts` reject browser-supplied `projectId`/`jobOpeningId`/`slotId` (RQ-06 + DEC-11) cho slug-bound apply.
4. **Database state**: `JobPosting.status='PUBLISHED'`, `JobOpening.status='OPEN'`, linked slot có `slots_filled < slots_needed`, `deadline_date >= now()` (hoặc NULL), `valid_to >= now()` (hoặc NULL).

**A1 KHÔNG sửa**:

- `CandidateSubmission` write chain (RPC body INSERT cột).
- Insert/update `LaborProfile`, `PlacementCase`.
- `application_status_history` (chỉ A1 chèn initial NULL→'NEW' PUBLIC_APPLY đã có sẵn ở legacy MP-2).
- `withIdempotency` wrap cho slug-bound apply route (legacy MP-2 idempotency ở RPC vẫn đủ, nhưng wrap service-level có lợi — **sẽ thuộc B**).
- Bất kỳ kết nối nào với `referral_attributions` cho slug-bound apply (đã tách ở CAP-15; A1 không tự ý mở).

### 3.2 Phụ thuộc B → A1

**P1-B không bắt đầu code cho đến khi A1 đạt ACCEPTED** tại cùng baseline (hoặc baseline kế tiếp A1 freeze). Đây là gate cứng cho `Next gate = WAIT_P1_A1_ACCEPTED`. Khi A1 đã ACCEPTED:

1. `app/api/public/jobs/[slug]/applications/route.ts` đã sẵn sàng resolve `PUBLISHED JobPosting + OPEN JobOpening + bound available slot` trong transaction (atomic).
2. Function body `hrp_public_apply_submission` đã được thay (giữ signature/owner/grants/search_path) để validate `JobPosting.status='PUBLISHED'` + `JobOpening.status='OPEN'`.
3. Public read conversion đã được A1 cut-over, `/viec-lam/[slug]` đang dùng canonical JobPosting.

Lúc đó P1-B có bề mặt ổn định để **mở rộng write chain** thành:

1. RPC body (hoặc helper được embed trong route/service) thực hiện PL/pgSQL mirror `scoreAndClassify` (≥2-signal EXACT_MATCH, ngược lại NEW_PROFILE) — dựa trên `src/domains/talent/labor-profile.service.ts:164-168`.
2. INSERT `labor_profiles` khi `verdict='NEW_PROFILE'`.
3. INSERT `placement_cases` (status='OPEN') hoặc reuse active case trên cùng `LaborProfile` qua partial unique index.
4. INSERT `candidate_submissions` với `labor_profile_id` + `placement_case_id` MỚI gắn (mirror AFF-03C pattern).
5. INSERT `application_status_history` (NULL → 'NEW' PUBLIC_APPLY) — đã sẵn ở legacy MP-2; giữ.
6. Append-only; KHÔNG cập nhật `Worker`/`SourceClaim`.
7. Wrap service trong `withIdempotency` (lớp defense-in-depth ngoài DB-level replay).

### 3.3 B không tái mở A1 territory

| Hạng mục | A1 | B | Ghi chú |
|---|---|---|---|
| Public detail React DOM @tiptap/static-renderer | ✅ | ❌ | A1 chỉ consume `src/shared/content/job-posting-rich-text/**` (OD-P1A-02). |
| Forward-only migration replace body `hrp_public_apply_submission` (signature/owner/grants/search_path unchanged) | ✅ (đúng một) | ❌ | A1 thay; B KHÔNG migrate thay. Nếu B cần thay body vì cần mirror score/case/submit chain thì B sẽ tạo migration #2 forward-only cùng quy ước, sau A1. |
| SEO metadata + JSON-LD từ canonical JobPosting | ✅ | ❌ | Outside P1-B. |
| Atomic JobPosting+JobOpening+slot guard trong `hrp_public_apply_submission` | ✅ (DEC-10/11 A1) | ✅ (assumes A1 đã làm) | B assume contract này tồn tại; B verify qua integration test, không tự viết guard. |
| `CandidateSubmission.jobPostingId` persistence | ❌ (A1) | ❌ (B) | OD-P1A-09; nếu cần thì task riêng sau P1-B. |
| `withIdempotency` wrap cho route apply | Tùy chọn (A1 có thể thêm) | ✅ (B sở hữu) | A1 RQ/AC §không đề cập; B mở khi implement. |
| PL/pgSQL mirror score/case/submit chain trong RPC body | ❌ (A1 không thêm) | ✅ (B thêm) | B's loại; mirror reference AFF-03B. |
| Referral attribution cho slug-bound apply | ❌ (A1) | ❌ (B round này) | OD chờ chốt policy; có thể mở task additive sau P1-B. |
| Tracking read projection | ❌ (A1) | ❌ (B) | B verify tương thích schema; không sửa projection. |
| CRM review threads (`ApplicantNote`, screening) | ❌ | ❌ | P1-C/D. |

## 4. Owner Decisions — chốt theo T0 directive correction C-06 (OD-P1B-01..06)

**Toàn bộ OD-P1B-* đã được T0 chốt tại directive correction C-06 cùng ngày. Trạng thái CHOSEN phản ánh T0 đã duyệt nội dung. Không còn Open Questions.**

| ID | Decision | Trạng thái | Materialized in |
|---|---|---|---|
| `OD-P1B-01` | P1-B tiếp quản canonical slug-bound apply write chain SAU khi P1-A1 ACCEPTED. P1-B KHÔNG thay atomic PUBLISHED/OPEN/slot guard (đó là DEC-10 của A1); P1-B KHÔNG tự thay route shape hay JobPosting detail. | CHOSEN | TASK.md v1.1 §1/§4 |
| `OD-P1B-02` | LaborProfile create-or-match: mirror `≥2-signal EXACT_MATCH` (canonical algorithm hiện hành), dựa trên `src/domains/talent/labor-profile.service.ts:164-168`. SAME algorithm trong PL/pgSQL mirror ở RPC. NEW_PROFILE → INSERT `labor_profiles`; EXACT_MATCH → reuse; POSSIBLE_MATCH → fail closed (generic 409 `POSSIBLE_MATCH_NOT_RESOLVED` không candidates/IDs/PII). | CHOSEN | TASK.md v1.1 §3/§4 |
| `OD-P1B-03` | PlacementCase open/reuse: partial unique index giữ max 1 active case per `LaborProfile`. Savepoint pattern trong PL/pgSQL tránh race. | CHOSEN | TASK.md v1.1 §4 |
| `OD-P1B-04` | Write chain authority duy nhất = SECURITY DEFINER function `hrp_public_apply_submission` (A1 thay body cho PUBLISHED/OPEN guard; P1-B thay body tiếp để mirror score/case/submit chain). Giữ nguyên exact signature `RETURNS TABLE(tracking_code text, status text)`, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`. Table grants tối thiểu: `INSERT/UPDATE labor_profiles`, `INSERT placement_cases`, `SELECT labor_profiles by phone/cccd`. KHÔNG tạo `_v2(jsonb)` helper. | CHOSEN | TASK.md v1.1 §3/§4 |
| `OD-P1B-05` | Idempotency authority duy nhất = DB-level trong `hrp_public_apply_submission` (legacy MP-2 invariant). Same key + same payload → stored `tracking_code`/`status`; same key + different payload → `P0010`/409; concurrent same-key → exactly one canonical mutation. Route tiếp tục yêu cầu `Idempotency-Key` header UUID. KHÔNG wrap service với `withIdempotency`/`idempotency_keys` trong slice này. | CHOSEN | TASK.md v1.1 §4 |
| `OD-P1B-06` | Synthetic applicant data cho integration test: row CCCD test (`0CCCD-TEST-…`) chỉ round-trip DB-level; KHÔNG CCCD thật; chỉ cần trigger scoring algorithm. CCCD thật KHÔNG là coding gate. | CHOSEN | TASK.md v1.1 §6 |

**Mở rộng chốt thêm:**
- Slug-bound apply KHÔNG đọc/bind `hrp_aff` cookie trong P1-B. Referral attribution là task additive riêng (OD chốt C-06 / DEC-13).
- Replace body `hrp_public_apply_submission` hiện hữu. KHÔNG tạo `_v2(jsonb)`.
- Giữ exact canonical classification algorithm/signals hiện hành; KHÔNG tự thêm hoặc thu hẹp signal.
- Giữ initial history reason `'PUBLIC_APPLY'`.
- KHÔNG thêm `cs_source`, `jobPostingId`, attribution column/schema.

## 5. BUILD_VS_ADOPT — đề xuất

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Rate-limit guard (IP + phone) | `RATE_LIMIT_RULES.APPLY_IP/APPLY_PHONE` ở `src/shared/security/rate-limit-port.ts`; provider upstash-redis + memory fallback | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/security/**` | DUAL bucket + RATE_LIMIT_RULES là wrapper contract đã ổn định qua OPS-06A. KHÔNG thay đổi surface, KHÔNG tự viết lại limiter. |
| Request body capping (16 KiB) + media-type gate | `readCappedJson` ở `src/shared/security/request-body.ts` (default `APPLY_MAX_BODY_BYTES = 16 KiB`) | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/security/request-body.ts` | Wrapper đã có static test guard 413/415; reuse. |
| Hand-crafted shape gate | `ACCEPTED_FIELDS`/`STRING_FIELDS` pattern ở A1 | `ADOPT` | n/a | n/a | `app/api/public/jobs/[slug]/applications/route.ts` | Đồng nhất với A1 §4.2 chốt (hand-crafted), không Zod. Không cài package. |
| Idempotency wrap (service) | `withIdempotency` ở `src/shared/integrity/idempotency/**` | **REFERENCE ONLY** | n/a | n/a | `src/shared/integrity/idempotency/**` | AFF-03B route đã dùng. Nhưng canonical slug-bound apply KHÔNG wrap service với `withIdempotency` trong slice này (C-05 / DEC-07): DB-level idempotency trong `hrp_public_apply_submission` là mutation authority duy nhất. |
| LaborProfile scoring algorithm | `scoreAndClassify` ở `src/domains/talent/labor-profile.service.ts` | **REFERENCE (read-only)** | n/a (HRP internal) | n/a | `src/domains/talent/labor-profile.service.ts` | Canonical algorithm hiện hành. PL/pgSQL mirror trong RPC `hrp_public_apply_submission` body thay thế runtime role của Node service. Conformance vectors kiểm tra PL/pgSQL khớp canonical algorithm. KHÔNG fork, KHÔNG nằm runtime write path của P1-B. |
| PlacementCase open/reuse | `openPlacementCase` ở `src/domains/talent/placement-case.service.ts` + partial unique index | **REFERENCE (read-only)** | n/a (HRP internal) | n/a | `src/domains/talent/placement-case.service.ts` | Race-safe savepoint pattern đặt tại PL/pgSQL trong RPC body qua partial unique index. KHÔNG nằm runtime write path của P1-B. |
| `hrp_public_*` RPC ownership/grants pattern | Migration pattern ở `20260823101500_mp2_apply_tracking` + `20260919100000_aff03b_public_intake_rpc` | `ADOPT` | n/a | n/a | `prisma/migrations/**` (forward-only) | B thay body `hrp_public_apply_submission` (giữ exact signature/owner/grants/search_path); KHÔNG tạo `_v2(jsonb)`. Bổ sung table grants tối thiểu cho chain mới. |
| Masking (`maskPhone`/`maskCccd`) | `src/shared/privacy/mask` | `ADOPT` | n/a | n/a | `src/shared/privacy/mask` | Tracking read side đã dùng; B verify row mới tương thích. |
| Tracking code generator | `generateTrackingCode` ở `src/domains/applications/apply-helpers.ts` | `ADOPT` | n/a | n/a | `src/domains/applications/apply-helpers.ts` | Reuse — không xây lại RNG. |

**KHÔNG adopt `withIdempotency`/`idempotency_keys` cho canonical slug-bound apply trong slice này (C-05): DB-level idempotency trong `hrp_public_apply_submission` là mutation authority duy nhất.**

## 6. BUILD_VS_AUTOMATE — chốt theo T0 directive C-08

**Core P1-B: N/A (HRP-owned runtime). n8n task riêng ghi rõ boundary.**

| Capability | Decision | Lý do |
|---|---|---|
| Public apply write chain (validation, scoring, INSERT LaborProfile/PlacementCase/CandidateSubmission) | `N/A` (HRP-owned runtime) | Core pipeline nằm trong HRP, không giao n8n. |
| n8n post-commit notification / AI triage | **Task riêng** sau P1-B | Theo `docs/N8N_AUTOMATION_BOUNDARY.md`: outbox/event hook cho async notification/distribution; B KHÔNG giao boundary này trong round này. Task riêng phải đảm bảo: event/outbox only, no direct DB write, no PII export mặc định, apply không phụ thuộc n8n availability. |
| `ReferralAttribution` cho slug-bound apply | `N/A` (đã chốt KHÔNG mở trong P1-B) | DEC-13: slug-bound apply KHÔNG đọc `hrp_aff`. Referral attribution là task additive riêng sau P1-B. |
| `Worker`/`SourceClaim` cho public anon apply | `N/A` (HRP-owned, không auto-create) | Legacy MP-2 invariant: anon apply KHÔNG tạo Worker/SourceClaim. |

`ORCHESTRATE` không áp dụng (round này chưa có orchestrator). Theo `docs/N8N_AUTOMATION_BOUNDARY.md`, khi mở task riêng cho outbox/n8n cần: n8n CHỈ nhận versioned event/outbox + gọi narrow API; KHÔNG direct DB write; KHÔNG giữ auth/RLS/state/idempotency authority; apply phải thành công khi n8n unavailable; KHÔNG đưa PII/credential thật vào workflow hoặc evidence. Boundary sẽ được chốt ở task additive sau.

## 7. Thin Slice — chốt theo T0 directive C-02..C-07

**Thin slice của P1-B (chỉ chạy sau khi A1 ACCEPTED tại cùng baseline evolution). Một write authority duy nhất = SECURITY DEFINER RPC. KHÔNG Node-side parallel guard.**

1. **Forward-only `CREATE OR REPLACE FUNCTION hrp_public_apply_submission(...)` thay body hiện hữu** (giữ exact signature `RETURNS TABLE(tracking_code text, status text)`, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`; KHÔNG tạo `_v2(jsonb)`) để:
   - Bảo toàn A1 PUBLISHED/OPEN/slot guard.
   - Mirror PL/pgSQL `scoreAndClassify` (≥2-signal EXACT_MATCH — canonical algorithm hiện hành). NEW_PROFILE → INSERT `labor_profiles`; EXACT_MATCH → reuse; POSSIBLE_MATCH → fail closed, RAISE custom SQLSTATE (query-local code chưa dùng, e.g. `P0014`) — không tạo partial application/profile/case.
   - Conformance vectors: PL/pgSQL classification khớp canonical algorithm `scoreAndClassify` (`src/domains/talent/labor-profile.service.ts:164-168`).
   - INSERT hoặc reuse `PlacementCase` qua partial unique index `placement_case_labor_profile_id_active_unique` (savepoint pattern).
   - INSERT `candidate_submissions` với `labor_profile_id` + `placement_case_id` gắn (mirror AFF-03C pattern).
   - INSERT `application_status_history` (NULL→'NEW', reason='PUBLIC_APPLY') — đã có sẵn.
   - Toàn chain rollback atomic nếu bất kỳ bước nào fail.
   - DB-level idempotency (legacy MP-2 invariant): same key + same payload → stored `tracking_code`/`status`; same key + different payload → `P0010`/409; concurrent same-key → exactly one canonical mutation.
   - Duplicate guard: `slot_id + normalized_phone + status NOT IN ('REJECTED','WITHDRAWN')` → `P0012`/409.

2. **Node chỉ validate/normalize/hash/mint tracking code, gọi RPC, map public response** — KHÔNG gọi `createOrMatchLaborProfile`/`openPlacementCase`/tác vụ write khác. `labor-profile.service.ts` và `placement-case.service.ts` chỉ là algorithm/reference evidence; KHÔNG nằm trong runtime write path của P1-B.

3. **Route `app/api/public/jobs/[slug]/applications`** (modify trên A1 baseline; KHÔNG thay route shape):
   - Giữ nguyên shape gate, rate-limit IP/phone, body cap 16 KiB, CV non-null 422 (A1 đã chốt).
   - Yêu cầu một canonical `Idempotency-Key` header UUID (KHÔNG ghi "header hoặc body").
   - KHÔNG wrap service trong `withIdempotency`/`idempotency_keys`.
   - Map RPC error codes: `POSSIBLE_MATCH_NOT_RESOLVED` → generic 409 không candidates/IDs/PII; `DUPLICATE_APPLICATION` → 409; `IDEMPOTENCY_CONFLICT` → 409; `JOB_NOT_AVAILABLE` (A1) → 4xx.
   - Trả 201 chỉ `{ trackingCode, status }`. KHÔNG leak internal IDs.

4. **Mapping `submitPublicApplication`** — chỉ map RPC result `{ tracking_code, status }` ra `{ trackingCode, status }`. KHÔNG gọi write services khác. Update `mapApplySqlState` cho SQLSTATE mới (POSSIBLE_MATCH) — code query-local/custom chưa dùng; KHÔNG đổi P0010/P0011/P0012.

5. **Static test mở rộng**: `src/domains/applications/marketplace-apply.routes.static.test.ts` (AST guard):
   - KHÔNG tự thêm cột/fork node trên profile rich-text.
   - KHÔNG mở CV upload.
   - KHÔNG mở `app/jobs/apply`.
   - KHÔNG wrap `withIdempotency`/`idempotency_keys` cho slug-bound apply.
   - KHÔNG gọi `createOrMatchLaborProfile`/`openPlacementCase` từ Node runtime path.
   - KHÔNG log raw fullName/phone/cccd.
   - KHÔNG bỏ rate-limit guard trước parse.
   - Public response chỉ `{ trackingCode, status }`.

6. **Integration test** `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (Neon container-DB, runtime-role lane KHÔNG set `app.role` GUC; ENV_BLOCKED khi `DATABASE_URL_TEST` thiếu, không fake PASS):
   - Happy path: PUBLISHED + OPEN + bound slot → 201 `{ trackingCode, status }` + DB rows: 1 LaborProfile + 1 PlacementCase + 1 CandidateSubmission (2 FK gắn) + 1 history.
   - EXACT_MATCH reuse (fixture khác slot/job so với duplicate guard): same LaborProfile, new PlacementCase/CandidateSubmission.
   - NEW_PROFILE first time.
   - POSSIBLE_MATCH fail closed: generic 409, zero new LaborProfile/PlacementCase/CandidateSubmission/history rows, response không chứa candidates/IDs/PII.
   - DRAFT/ARCHIVED → 4xx.
   - FILLED opening → 4xx.
   - Slot ngoài linked opening → 4xx.
   - Idempotency replay: cùng `trackingCode`/`status` + DB row counts.
   - Idempotency conflict: P0010/409.
   - Concurrency race: winner INSERT + replay.
   - Duplicate guard (fixture riêng).
   - Atomic rollback toàn chain khi bất kỳ bước nào fail.
   - Conformance vectors PL/pgSQL khớp canonical algorithm.
   - Synthetic CCCD round-trip.

7. **Ngân sách trace**: zero thay đổi `prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/content/job-posting-rich-text/**`, `src/shared/ui/editor/**`. KHÔNG tạo `public-application.types.ts`. KHÔNG fork labor-profile.service.ts / placement-case.service.ts (reference only). KHÔNG sửa public field roster đã thuộc P1-A1. KHÔNG thêm `CandidateSubmission.jobPostingId`/`cs_source`/attribution column/schema.

## 8. Migration/Rollback — chốt theo T0 directive

- KHÔNG schema change.
- Forward-only migration: B tạo **đúng một migration** forward-only `CREATE OR REPLACE FUNCTION hrp_public_apply_submission(...)` thay body hiện hữu (sau A1 ACCEPTED). KHÔNG tạo `_v2(jsonb)` helper. Giữ exact signature `RETURNS TABLE(tracking_code text, status text)`, owner `hrp_public_rpc`, grants, `SET search_path = public, pg_temp`. Thêm table grants tối thiểu: `INSERT/UPDATE labor_profiles`, `INSERT placement_cases`, `SELECT labor_profiles by phone/cccd` (mirror pattern `20260823101500_mp2_apply_tracking` lines ~226–258).
- Toàn chain rollback atomic nếu bất kỳ bước nào fail (savepoint + RAISE EXCEPTION trong PL/pgSQL).
- KHÔNG tự publish bất kỳ JobPosting/JobOpening status nào (DEC-13 / OD-P1A-05 / OD-P1A-10).

## 9. Open Questions — đã đóng toàn bộ theo T0 directive C-06

**Không còn Open Questions.** T0 đã chốt toàn bộ OQ trong directive correction C-06:

- OQ-01 referral attribution → DEC-13: slug-bound apply KHÔNG đọc `hrp_aff`, referral attribution là task additive riêng.
- OQ-02 storage layout → DEC-09: replace body `hrp_public_apply_submission` hiện hữu, KHÔNG tạo `_v2(jsonb)`.
- OQ-03 EXACT_MATCH signal set → DEC-03: giữ canonical algorithm hiện hành, KHÔNG tự thêm hoặc thu hẹp signal.
- OQ-04 initial status reason → DEC-14: giữ `'PUBLIC_APPLY'`.
- OQ-05 cs_source / attribution → DEC-14: KHÔNG thêm column/schema attribution.

§8 hoàn toàn đóng.

## 10. Mapping P1 chain

| Phase | Task | Owner | Status hiện tại |
|---|---|---|---|
| P1-A0 (Admin Posting Authoring + Publish) | `hrp-p1-a0-jobposting-authoring-publish` | T1A | ACCEPTED tại `c4418bb9…` (xem `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/AUDIT.md`); Task §10 Revision Log v1.5. |
| P1-A1 (Canonical Public Job Detail + Apply Boundary) | `hrp-p1-a1-canonical-public-job-detail` | T1A | PROPOSED_ONLY v1.2 (xem `docs/tasks/hrp-p1-a1-canonical-public-job-detail/TASK.md`). Round này T1A triển khai. |
| **P1-B (Public Apply — processing & lifecycle transition)** | **`hrp-p1-b-public-apply`** | **T1B** | **Planning v1.2 (RECONCILIATION + TASK.md v1.2)** |
| P1-C (CRM review threads) | `hrp-p1-c-application-review` | T1B/T1A? | CHƯA định nghĩa task; nằm ngoài round này. |
| P1-D (Outbound notifications / distribution) | `hrp-p1-d-candidate-notify` | T1B/T1A? | CHƯA định nghĩa task; nằm ngoài round này. |

P1-B chỉ khả thi sau khi A1 đạt `ACCEPTED`. Round này chuẩn bị RECONCILIATION + TASK.md để khóa chính xác file ownership cho implementation round sau.

## 11. Phạm vi file lần này (this round)

| Layer | File | Trạng thái |
|---|---|---|
| Discovery | `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md` (file này) | Created ở round `codex/t1b-p1-b-public-apply-contract` |
| Task contract | `docs/tasks/hrp-p1-b-public-apply/TASK.md` | v1.0 created; v1.1 updated theo T0 directive correction C-01..C-08; v1.2 T0 control finalization |

KHÔNG sửa bất kỳ file nào ở runtime, schema, package, hay file do T1A đang sở hữu. Đặc biệt KHÔNG sửa `docs/PLANNER_HANDOVER.md` (forbidden bởi T0 directive).

## 12. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-25` | Initial planning reconciliation dựa trên baseline `91525013fc2720a3803e808baac39e1c4497daf6`; capability matrix; A1↔B boundary; OD đề xuất §4; BUILD_VS_ADOPT §5; BUILD_VS_AUTOMATE §6; thin slice §7; OD chờ §9. | Round T1B documentation-only theo T0 directive 2026-09-25. |
| `v1.1` | `2026-09-25` | T0 contract correction theo C-01..C-08: §4 OD-P1B-01..06 CHOSEN + mở rộng chốt thêm (slug-bound KHÔNG đọc `hrp_aff`, replace body hiện hữu không tạo `_v2`, canonical algorithm giữ nguyên, reason `PUBLIC_APPLY`, KHÔNG schema/column mới); §5 BUILD_VS_ADOPT: withIdempotency → REFERENCE ONLY, labor/placement → REFERENCE (read-only); §6 BUILD_VS_AUTOMATE: n8n task riêng ghi rõ boundary; §7 thin slice: một write authority duy nhất = SECURITY DEFINER RPC, xóa Node-side parallel guard, public response chỉ `{ trackingCode, status }`, POSSIBLE_MATCH fail closed generic 409, idempotency duy nhất = DB-level, KHÔNG wrap withIdempotency, atomic rollback toàn chain; §8 migration: đã chốt, KHÔNG tạo `_v2(jsonb)`; §9 Open Questions: toàn bộ đã đóng (C-06). §11 cập nhật. | T0 correction directive 2026-09-25 đóng gap C-01..C-08. |
| `v1.2` | `2026-09-25` | T0 docs-only control finalization: đồng bộ TASK `Decision state = CLOSED`, `Test environment = READY`; sửa nhãn reconciliation `CHOSED` thành `CHOSEN`; không đổi semantic C-01..C-08. | Tier 1 đã dùng correction budget 1/1; T0 xử lý trực tiếp residual control/format issue. |
