# TASK — `hrp-p1-b-public-apply`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-b-public-apply` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `ADOPT` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Public anon N1 apply pipeline ghi vào `candidate_submissions` + `labor_profiles` + `placement_cases` qua SECURITY DEFINER boundary; HRP-owned runtime critical path (PII ingest, idempotency, race-safe open placement case, partial unique index); LIGHT audit đảm bảo changed surface (route, service, function body, table grants) được đối chiếu sau khi implementation freeze SHA. Risk acceptance: Owner/T0 chấp nhận LIGHT audit cho thin slice đầu của public marketplace; người chấp nhận rủi ro: T0 (T0 directive 2026-09-25 chốt OD-P1A-* và đề xuất OD-P1B-* trong `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md` v1.0).` |
| Spec version | `v1.0` |
| Status | `PROPOSED_ONLY` |
| Planner | `Tier 1B` |
| Baseline | `91525013fc2720a3803e808baac39e1c4497daf6` |
| Contract gate | `DRAFT` |
| Decision state | `CLOSED` |
| Test environment | `NOT_REQUIRED` |
| Correction budget | `1` |
| In-scope roots | `app/api/public/jobs/[slug]/applications/route.ts` (modify trên A1 baseline; KHÔNG thay route shape — A1 sở hữu); `src/domains/applications/application.service.ts` (modify `submitPublicApplication` để mirror score/case/submit chain, KHÔNG đổi signature hiện có mà A1 đã chốt); `src/domains/applications/apply-helpers.ts` (consume only — reuse `generateTrackingCode`, `computeIdempotencyKeyHash`, `computeApplyPayloadHash`, `mapApplySqlState`); `src/domains/applications/public-application.types.ts` (mới — DTO `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict }`); `src/domains/talent/labor-profile.service.ts` (consume only — reuse `scoreAndClassify`, `createOrMatchLaborProfile` cho Node-side parallel guard); `src/domains/talent/placement-case.service.ts` (consume only — reuse `openPlacementCase`); `src/shared/integrity/idempotency/**` (consume only — wrap `withIdempotency`); `src/shared/security/rate-limit-guard.ts`, `src/shared/security/request-body.ts`, `src/shared/security/rate-limit-port.ts` (consume only); `prisma/migrations/2026MMDD000000_p1b_public_apply_lifecycle/migration.sql` (đúng một forward-only migration thay body `hrp_public_apply_submission` để mirror score/case/submit chain — KHÔNG sửa migration cũ); `src/domains/applications/marketplace-apply.routes.static.test.ts` (mới hoặc mở rộng nếu đã có — AST guard); `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (mới — Neon container-DB, runtime-role lane); targeted unit tests cho `submitPublicApplication` |
| Forbidden paths | `docs/PLANNER_HANDOVER.md` (T0-owned); `docs/tasks/hrp-p1-a1-canonical-public-job-detail/**` (T1A-owned); `docs/tasks/hrp-p1-a0-jobposting-authoring-publish/**` (T1A-frozen); `src/domains/job-board/public.service.ts` (A1-owned); `app/(jobs)/viec-lam/**` (A1-owned); `src/shared/content/job-posting-rich-text/**` (A0/A1-frozen shared profile); `src/shared/ui/editor/**` (A0-owned client editor wrapper); `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/domains/job-board/publish.service.ts` (legacy `Project.isPublic`); `app/api/jobs/apply/route.ts` (DEC-10 retired stub); `app/api/public/jobs/route.ts`, `app/api/public/jobs/[slug]/route.ts` (T1A-owned public browse); `app/api/public/intake/route.ts`, `src/domains/applications/aff03-public-intake.service.ts`, `prisma/migrations/20260919100000_aff03b_public_intake_rpc/**`, `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/**` (AFF-03B/C territory, reference only — KHÔNG fork, KHÔNG mở rộng RPC `hrp_public_intake_submission` trong round này); `prisma/migrations/2026MMDD000000_p1a1_*/**` (A1 forward-only body replacement — KHÔNG sửa, chỉ consume sau khi A1 ACCEPTED); `tests/db/aff03-public-intake.integration.test.ts`; `src/domains/applications/aff03-public-intake.service.test.ts`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/talent/intake-writer.service.ts` (non-anon writer for staff intake — KHÔNG đụng) |
| Required gates | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit` (cover `submitPublicApplication` mirror + DTO + AST static guards); `npm run test:integration` (cover `tests/db/p1b-public-apply-slug-bound.integration.test.ts` khi DB env sẵn sàng) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `WAIT_P1_A1_ACCEPTED` |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho thin slice public marketplace; người chấp nhận rủi ro ghi rõ trong `Audit reason`.

> Contract gate `DRAFT` cho round này: T1B chuẩn bị contract dựa trên A0 ACCEPTED (`c4418bb9`) + A1 v1.2 (DRAFT/PROPOSED_ONLY) ở baseline `91525013f`. Execution KHÔNG khởi động cho tới khi P1-A1 ACCEPTED. Decision state `CLOSED` phản ánh rằng các OD-P1B đề xuất (§3) đã được T1B chốt từ authority sẵn có — không mở thêm OD-P1B-* mới trong round này ngoài §8 (Open Questions) đã chờ Owner.

## 1. Outcome

### 1.1 User-visible outcome

- Ứng viên ẩn danh (N1) truy cập `/viec-lam/[slug]` (A1 đã cutover) → nhấn "Ứng tuyển" → điền form → `POST /api/public/jobs/[slug]/applications`:
  - Rate-limit IP + phone giữ nguyên (DUAL bucket).
  - Body shape gate hand-crafted; CV non-null vẫn 422 `CV_UPLOAD_DISABLED`.
  - SECURITY DEFINER RPC `hrp_public_apply_submission` (đã được A1 thay body để validate `PUBLISHED JobPosting + OPEN JobOpening + bound available slot`) chạy mirror `scoreAndClassify` → EXACT_MATCH (reuse `LaborProfile`) / NEW_PROFILE (INSERT `labor_profiles`) / POSSIBLE_MATCH (409 với candidate list).
  - Mở hoặc reuse `PlacementCase` qua partial unique index cho cùng `LaborProfile`.
  - INSERT `CandidateSubmission` với `labor_profile_id` + `placement_case_id` gắn; INSERT initial `application_status_history` (NULL→'NEW', reason='PUBLIC_APPLY').
  - Trả DTO 201 với `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict }`. Route KHÔNG leak `referrerUserId`/`attributionId`/`referralAttributionId` (nếu Owner mở slug-bound attribution ở task sau, sẽ không có ở thin slice này).
- Tracking read `GET /api/public/applications/[trackingCode]` tiếp tục phục vụ DTO với `fullName` + masked `phoneMasked`/`cccdMasked`, không đổi schema. Nếu `CandidateSubmission` của P1-B có thêm 2 FK nullable `laborProfileId`/`placementCaseId` so với MP-2 era (đã có ở CAP-05), tracking projection không cần thay — left join staffing_order_slots + outsourcing_projects đã đủ.
- Khi n8n unavailable: apply vẫn thành công (HRP-owned write chain; n8n chỉ là post-commit notification tách biệt — ngoài phạm vi P1-B).

### 1.2 Non-goals

- KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`.
- KHÔNG fork shared rich-text profile `src/shared/content/job-posting-rich-text/**` (A0/A1-frozen).
- KHÔNG sửa `app/(jobs)/viec-lam/**` hay `src/domains/job-board/public.service.ts` (A1-owned).
- KHÔNG sửa migration A0/A1 cũ; chỉ tạo đúng một forward-only migration mới thay body `hrp_public_apply_submission` (giữ signature/owner/grants/search_path theo DEC-14 + A1 RQ-08) để mirror score/case/submit chain.
- KHÔNG mở CV upload; CV non-null vẫn 422.
- KHÔNG mở legacy `/api/jobs/apply` (DEC-10 retired 410); chỉ canonical `/api/public/jobs/[slug]/applications`.
- KHÔNG mở `referral_attributions` consume cho slug-bound apply trong round này (OD §3 chờ Owner); `app/api/public/intake` (AFF-03B) vẫn đường song song với signed cookie.
- KHÔNG mở P1-C (CRM review threads), P1-D (outbound notifications/n8n) — task riêng.
- KHÔNG tự publish JobPosting/JobOpening; cắt cứ theo A1 đã validate `PUBLISHED + OPEN`.
- KHÔNG bắt buộc CCCD thật; synthetic CCCD row (`0CCCD-TEST-…`) chỉ round-trip DB-level.
- KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09; nếu cần persisted attribution tới JobPosting mở task additive riêng sau P1-B).
- KHÔNG fork hay mở rộng RPC `hrp_public_intake_submission` (AFF-03B) — chỉ tham chiếu làm reference.

## 2. Evidence

Chỉ liệt kê bằng chứng cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/api/public/jobs/[slug]/applications/route.ts` hiện delegate toàn bộ write chain cho `submitPublicApplication` ở `src/domains/applications/application.service.ts:117`. | Đây là canonical slug-bound apply entry point; P1-B tiếp quản SAU khi A1 thay body RPC. |
| `EV-02` | RPC `hrp_public_apply_submission` ở `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` lines ~80–199: hiện chỉ INSERT `candidate_submissions` (vendor_id=NULL, ctv_id=NULL) + INSERT `application_status_history` (NULL→'NEW' PUBLIC_APPLY). KHÔNG gọi `scoreAndClassify`, KHÔNG INSERT `labor_profiles`, KHÔNG INSERT `placement_cases`. | Chứng minh P1-B's "missing" capability: pipeline chưa cắm LaborProfile/PlacementCase lifecycle. A1 sẽ thay body để enforce PUBLISHED/OPEN/slot guard trước; P1-B mở rộng body để mirror score/case/submit chain. |
| `EV-03` | Reference runtime: RPC `hrp_public_intake_submission` ở migration `20260919100000_aff03b_public_intake_rpc` đã chạy đúng `scoreAndClassify` mirror + INSERT `labor_profiles` (NEW_PROFILE) + INSERT `placement_cases` + INSERT `candidate_submissions` (vendor_id=NULL, ctv_id=NULL per DEC-13) + (khi attribution) UPDATE `referral_attributions` với guard `status='ACTIVE' AND expires_at > now() AND labor_profile_id IS NULL` + INSERT `labor_profile_handling_assignments`. Migration `20260921140000_aff03c_cs_labor_profile_backfill` đã sửa `candidate_submissions.labor_profile_id` insert. | Chứng minh reference pattern cho P1-B: same owner/grants/search_path, same scoring algorithm, same INSERT order. |
| `EV-04` | `src/domains/talent/labor-profile.service.ts:164-168` mirror `scoreAndClassify` ≥2-signal EXACT_MATCH (normalized phone + ít nhất một signal nữa); `createOrMatchLaborProfile` ở cùng file; mirror PL/pgSQL đặt cùng algorithm ở RPC `hrp_public_intake_submission`. | P1-B mirror cùng algorithm ở PL/pgSQL — KHÔNG tự sáng tác. |
| `EV-05` | `src/domains/talent/placement-case.service.ts` `openPlacementCase` dùng savepoint pattern chống race trên partial unique index `placement_case_labor_profile_id_active_unique`. | P1-B consume `openPlacementCase` ở Node-side parallel guard; trong RPC dùng savepoint pattern khi insert. |
| `EV-06` | `prisma/schema.prisma` `model CandidateSubmission`: PK `id` (cuid/text), nullable FK `laborProfileId` (FK ON DELETE RESTRICT), nullable FK `placementCaseId` (FK ON DELETE RESTRICT), `projectId`, `slotId`, normalized PII fields, CV metadata, `public_tracking_code`, `idempotency_key_hash`, `idempotency_payload_hash`, `status`, audit fields. KHÔNG có `jobPostingId`. | B dùng cấu trúc hiện có; KHÔNG đổi schema. Mapping trong code: dùng `cs.laborProfileId` + `cs.placementCaseId` (đã nullable) → fill từ RPC result. |
| `EV-07` | RPC body `hrp_public_apply_submission` hiện resolve Project-based (`Project.is_public=true`, `Project.status='ACTIVE'`, `StaffingOrder.status IN ('OPEN','CLOSING_SOON')`) — chưa biết `JobPosting.slug` hay `JobPosting.status`. | P1-A1 sẽ thay body để enforce PUBLISHED JobPosting + OPEN JobOpening. P1-B chỉ tiêu thụ contract A1 đã đặt; KHÔNG tự viết guard. |
| `EV-08` | `app/api/public/jobs/[slug]/applications/route.ts` lines ~30–72: `ACCEPTED_FIELDS`/`STRING_FIELDS` shape gate hand-crafted; line ~117–124: CV non-null 422; line ~110–111: `readCappedJson` 16 KiB gate. Rate-limit IP line ~103–108 trước parse body; rate-limit phone line ~126–134 sau parse trước transaction. | P1-B giữ nguyên shape gate (đồng nhất A1 §4.2); wrap service trong `withIdempotency` là thay đổi duy nhất ở route layer nếu A1 chưa làm. |
| `EV-09` | `app/api/public/intake/route.ts` lines ~191–319: model đầy đủ cho public anon N1 apply boundary — IP limit trước parse, parse cap 16 KiB, shape gate, CV gate, phone limit, idempotency-key UUID required, consentAt fallback, signed cookie silent fail-safe, `withIdempotency` wrap, RPC delegation, error map (400/409/413/415/422/429/503/500). | P1-B tham chiếu pattern này cho canonical slug-bound apply route. B KHÔNG copy verbatim — phải phù hợp slug-bound shape. |
| `EV-10` | `src/shared/integrity/idempotency/**` `withIdempotency`: wrap service-level idempotency qua bảng `idempotency_keys`. AFF-03B route đã dùng. | P1-B wrap `submitPublicApplication` (canonical slug-bound) với `withIdempotency` để có lớp defense-in-depth ngoài DB-level replay. |
| `EV-11` | `src/shared/security/rate-limit-port.ts` `RATE_LIMIT_RULES.APPLY_IP` (20/60s IP) + `RATE_LIMIT_RULES.APPLY_PHONE` (10/60s phone); provider Upstash Redis + memory fallback; `enforceRateLimits` ở `src/shared/security/rate-limit-guard.ts`. | P1-B reuse; KHÔNG tự viết limiter. |
| `EV-12` | `src/shared/security/request-body.ts` `readCappedJson` (`APPLY_MAX_BODY_BYTES = 16 KiB`); media-type gate 415. | P1-B reuse. |
| `EV-13` | `src/domains/applications/apply-helpers.ts` `generateTrackingCode` (120-bit bearer secret, base32) + `computeIdempotencyKeyHash` + `computeApplyPayloadHash` + `mapApplySqlState` + `normalizePhone`. | P1-B reuse nguyên — KHÔNG tự sáng tác RNG/hashing. |
| `EV-14` | `src/shared/privacy/mask` `maskPhone`/`maskCccd` cho tracking projection. Tracking route ở `app/api/public/applications/[trackingCode]/route.ts` lines ~26–45: dual-bucket limit, generic 404 no row-existence signal. | P1-B KHÔNG đụng read side; chỉ verify `CandidateSubmission` row mới tương thích field shape. |
| `EV-15` | `prisma/schema.prisma` `model LaborProfile`: PK `id`, identity fields (`normalizedPhone`, `cccdNumber`, `fullName`), timestamps, audit. RLS + writer policies đang active. | P1-B chỉ INSERT qua RPC mirror AFF-03B pattern. |
| `EV-16` | `prisma/schema.prisma` `model PlacementCase`: FK `laborProfileId`, `status ∈ {OPEN, IN_PROGRESS, READY_TO_PLACE, CLOSED}`, audit timestamps; partial unique index `placement_case_labor_profile_id_active_unique` ở migration N2-2. | P1-B INSERT hoặc REUSE; consume `openPlacementCase` ở Node-side parallel guard. |
| `EV-17` | `src/domains/applications/marketplace-inventory.static.test.ts`: AST/string detector đảm bảo rate-limit trước DB, dual-bucket tracking, single canonical apply route, retired stub. | P1-B mở rộng tương ứng khi đổi route/service — KHÔNG vi phạm guard. |
| `EV-18` | `tests/db/aff03-public-intake.integration.test.ts`: ENV_BLOCKED guard, runtime-role lane KHÔNG set `app.role` GUC, masked-hr-manager lane retained cho non-anon paths. Mirror pattern cho P1-B integration test. | P1-B integration test mirror cùng cấu trúc; ENV_BLOCKED khi `DATABASE_URL_TEST` thiếu. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | P1-B tiếp quản canonical slug-bound apply write chain SAU khi P1-A1 ACCEPTED tại baseline evolution của A1. P1-B KHÔNG thay atomic PUBLISHED/OPEN/slot guard (A1 DEC-10/11); P1-B KHÔNG tự thay route shape hay JobPosting detail. | CHOSEN |
| `DEC-02` | LaborProfile create-or-match mirror `≥2-signal EXACT_MATCH` (normalized phone + ít nhất một signal nữa hoặc CCCD). SAME algorithm trong Node-side `scoreAndClassify` (`src/domains/talent/labor-profile.service.ts:164-168`) và PL/pgSQL mirror ở RPC. NEW_PROFILE → INSERT `labor_profiles`; EXACT_MATCH → reuse; POSSIBLE_MATCH → 409 POSSIBLE_MATCH_NOT_RESOLVED + candidate list (mirror AFF-03B §error-map). | CHOSEN |
| `DEC-03` | PlacementCase open/reuse qua partial unique index `placement_case_labor_profile_id_active_unique`. INSERT `placement_cases` (status='OPEN') HOẶC reuse active case cho cùng `LaborProfile`. Savepoint pattern ở RPC để chống race. | CHOSEN |
| `DEC-04` | Write chain authority vẫn là SECURITY DEFINER function `hrp_public_apply_submission` (A1 thay body cho PUBLISHED/OPEN guard; P1-B thay body tiếp để mirror score/case/submit chain). Giữ nguyên signature/owner/grants/search_path theo DEC-14 (A1 RQ-08). Migration forward-only duy nhất của B (sau A1) KHÔNG sửa migration cũ. | CHOSEN |
| `DEC-05` | Idempotency hai lớp: (a) wrap service `submitPublicApplication` với `withIdempotency` (idempotency_keys table); (b) DB-level replay trong RPC (legacy MP-2 invariant SELECT idempotency_key_hash → idempotency_payload_hash). Replay trả cùng `candidateSubmissionId` + `laborProfileId` + `placementCaseId` + `verdict`. Idempotency-Key (UUID) REQUIRED ở header hoặc body. Idempotency-Conflict (same key + different payload) → 409 IDEMPOTENCY_CONFLICT. | CHOSEN |
| `DEC-06` | Duplicate application guard: `slot_id + normalized_phone + status NOT IN ('REJECTED','WITHDRAWN')` → 409 DUPLICATE_APPLICATION (RPC error code P0012). Race-safe qua savepoint INSERT → unique violation → re-check idempotency row, fallback DUPLICATE_APPLICATION. | CHOSEN |
| `DEC-07` | DTO 201: `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict }`. KHÔNG bao giờ `referrerUserId`/`attributionId`/`referralAttributionId` (chưa mở slug-bound attribution ở round này). KHÔNG echo PII ngoài 4 identity field Owner duyệt. | CHOSEN |
| `DEC-08` | Khởi tạo tracking code ở Node (`generateTrackingCode` 120-bit bearer secret) — KHÔNG sinh ở RPC để idempotent replay ổn định. | CHOSEN |
| `DEC-09` | Forward-only migration #2 của B (sau A1) hoặc `CREATE OR REPLACE FUNCTION` thêm helper `(p_payload jsonb)` cùng owner `hrp_public_rpc`. Quyết định này sẽ được chốt ở §8 Open Questions round 1 sau T0 review (replace body vs helper jsonb). **Hiện đề xuất: replace body** (mirror AFF-03B pattern `hrp_public_intake_submission` cũng replace body từ một legacy stub). | CHOSEN (đề xuất) |
| `DEC-10` | KHÔNG fork shared rich-text profile; P1-B chỉ consume `src/shared/content/job-posting-rich-text/**` (single source of truth do A0 freeze). KHÔNG đổi `prisma/schema.prisma`, `package.json`, `package-lock.json`. KHÔNG cài package mới. KHÔNG tự sáng tác scoring rule mới. | CHOSEN |
| `DEC-11` | Synthetic applicant data cho integration test: row CCCD test (`0CCCD-TEST-…`) chỉ round-trip DB-level; KHÔNG CCCD thật; chỉ cần trigger scoring algorithm. CCCD thật KHÔNG là coding gate. | CHOSEN |
| `DEC-12` | P1-B KHÔNG mở route `app/api/public/intake` (AFF-03B), KHÔNG mở `referral_attributions` consume cho slug-bound apply, KHÔNG tự ý thêm column `CandidateSubmission.jobPostingId`. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Rate-limit guard (IP + phone) | `RATE_LIMIT_RULES.APPLY_IP/APPLY_PHONE` ở `src/shared/security/rate-limit-port.ts`; provider upstash-redis + memory fallback; `enforceRateLimits` ở `src/shared/security/rate-limit-guard.ts` | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/security/**` | DUAL bucket đã ổn định qua OPS-06A; KHÔNG tự viết limiter. |
| Request body capping (16 KiB) + media-type gate | `readCappedJson` ở `src/shared/security/request-body.ts` (`APPLY_MAX_BODY_BYTES = 16 KiB`) | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/security/request-body.ts` | Wrapper đã có static test guard 413/415; reuse nguyên. |
| Hand-crafted shape gate (`ACCEPTED_FIELDS`/`STRING_FIELDS`) | Pattern ở `app/api/public/jobs/[slug]/applications/route.ts` lines ~30–72 | `ADOPT` | n/a | n/a | `app/api/public/jobs/[slug]/applications/route.ts` | Đồng nhất A1 §4.2 chốt (hand-crafted, không Zod); không cài package mới. |
| Idempotency wrap (service-level) | `withIdempotency` ở `src/shared/integrity/idempotency/**` | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/integrity/idempotency/**` | AFF-03B route đã dùng; P1-B áp dụng cho slug-bound apply. |
| LaborProfile scoring algorithm | `scoreAndClassify` ở `src/domains/talent/labor-profile.service.ts:164-168` | `ADOPT` | n/a (HRP internal) | n/a | `src/domains/talent/labor-profile.service.ts` | Mirror PL/pgSQL cùng algorithm ở AFF-03B; KHÔNG tự sáng tác rule mới. |
| PlacementCase open/reuse | `openPlacementCase` ở `src/domains/talent/placement-case.service.ts` + partial unique index | `ADOPT` | n/a (HRP internal) | n/a | `src/domains/talent/placement-case.service.ts` | Race-safe savepoint pattern đã có; consume. |
| `hrp_public_apply_submission` RPC body extension | Forward-only `CREATE OR REPLACE FUNCTION` (mirror `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql` lines ~80–199 ownership/grants/search_path pattern) | `ADOPT` | n/a | n/a | `prisma/migrations/2026MMDD000000_p1b_public_apply_lifecycle/migration.sql` | Migration #2 (sau A1) forward-only thay body; giữ signature/owner/grants/search_path. |
| Masking (`maskPhone`/`maskCccd`) | `src/shared/privacy/mask` | `ADOPT` | n/a (HRP internal) | n/a | `src/shared/privacy/mask` | Tracking read side đã dùng; B verify row mới tương thích. |
| Tracking code generator | `generateTrackingCode` ở `src/domains/applications/apply-helpers.ts` (120-bit bearer secret, base32) | `ADOPT` | n/a (HRP internal) | n/a | `src/domains/applications/apply-helpers.ts` | Reuse — KHÔNG xây lại RNG. |

`ADOPT` đã pin license + version/source + wrapper boundary. `CUSTOM` không áp dụng; KHÔNG fork shared profile; KHÔNG cài package mới.

### 3.2 Build vs Automate

N/A (round này không giao orchestrator; tham chiếu `docs/N8N_AUTOMATION_BOUNDARY.md` cho task additive sau).

- Apply write chain vẫn HRP-owned runtime; n8n chỉ là post-commit notification tách biệt — ngoài phạm vi P1-B.
- `ReferralAttribution` cho slug-bound apply: CHƯA đề xuất; OD chờ Owner (xem §8).
- `Worker`/`SourceClaim` cho public anon apply: KHÔNG auto-create (legacy MP-2 invariant).

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `POST /api/public/jobs/[slug]/applications` (A1 canonical route shape) — SECURITY DEFINER function mirror score/case/submit chain trong cùng transaction. Route KHÔNG nhận `projectId`/`jobOpeningId`; browser-supplied `slotId` bị từ chối cho slug-bound flow (A1 DEC-11). |
| `RQ-02` | Mirror `scoreAndClassify` ≥2-signal EXACT_MATCH (mirror `src/domains/talent/labor-profile.service.ts:164-168`). NEW_PROFILE → INSERT `labor_profiles`; EXACT_MATCH → reuse; POSSIBLE_MATCH → 409 POSSIBLE_MATCH_NOT_RESOLVED + candidate list. |
| `RQ-03` | Open hoặc reuse `PlacementCase` qua partial unique index `placement_case_labor_profile_id_active_unique` (`status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')`). Savepoint pattern chống race. |
| `RQ-04` | INSERT `CandidateSubmission` với `labor_profile_id` + `placement_case_id` gắn (mirror AFF-03C pattern). INSERT initial `application_status_history` (NULL→'NEW', reason='PUBLIC_APPLY'). Vendor_id=ctv_id=NULL cho anon (DEC-13). |
| `RQ-05` | Forward-only migration mới thay body `hrp_public_apply_submission` (giữ signature/owner/grants/search_path theo A1 DEC-10). Migration chain/upgrade-path proof cho atomic chain. KHÔNG sửa migration cũ. |
| `RQ-06` | Idempotency-Key (UUID) REQUIRED. Wrap service `submitPublicApplication` với `withIdempotency` (lớp defense-in-depth) + DB-level replay trong RPC. Replay trả cùng `candidateSubmissionId` + `laborProfileId` + `placementCaseId` + `verdict`. Idempotency conflict (same key + different payload) → 409 IDEMPOTENCY_CONFLICT. |
| `RQ-07` | Duplicate application guard: `slot_id + normalized_phone + status NOT IN ('REJECTED','WITHDRAWN')` → 409 DUPLICATE_APPLICATION (RPC error code P0012). Race-safe qua savepoint INSERT + unique violation re-check. |
| `RQ-08` | DTO 201: `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict }`. KHÔNG bao giờ leak `referrerUserId`/`attributionId`/`referralAttributionId`. KHÔNG echo PII ngoài 4 identity field Owner duyệt. |
| `RQ-09` | Rate-limit IP + phone giữ nguyên (DUAL bucket `RATE_LIMIT_RULES.APPLY_IP/APPLY_PHONE`). Body cap 16 KiB qua `readCappedJson`. CV non-null 422 `CV_UPLOAD_DISABLED` (giữ DEC-09). |
| `RQ-10` | Synthetic applicant cho integration test: CCCD test (`0CCCD-TEST-…`) chỉ round-trip DB-level; KHÔNG CCCD thật; chỉ cần trigger scoring algorithm. |
| `RQ-11` | KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`, `src/shared/content/job-posting-rich-text/**`, `src/shared/ui/editor/**`, `src/domains/job-board/public.service.ts`, `app/(jobs)/viec-lam/**`, `app/api/public/jobs/route.ts`, `app/api/public/jobs/[slug]/route.ts`, `app/api/public/intake/route.ts`, `app/api/jobs/apply/route.ts`, migration A0/A1/AFF-03B/AFF-03C. |
| `RQ-12` | KHÔNG mở `referral_attributions` cho slug-bound apply trong round này; OD chờ Owner §8. KHÔNG thêm `CandidateSubmission.jobPostingId` (OD-P1A-09). |
| `RQ-13` | Static test mở rộng (AST/string detector) đảm bảo route/service sửa đổi: (a) KHÔNG tự thêm cột/fork node trên rich-text profile; (b) KHÔNG mở CV upload; (c) KHÔNG mở legacy `/api/jobs/apply`; (d) DTO include đúng 4 identity field; (e) KHÔNG log raw fullName/phone/cccd; (f) KHÔNG bỏ rate-limit guard trước parse. |
| `RQ-14` | Integration test Neon container-DB ENV_BLOCKED guard; runtime-role lane KHÔNG set `app.role` GUC (mirror `aff03-public-intake.integration.test.ts` pattern). Test cases: happy path (NEW_PROFILE), EXACT_MATCH reuse, POSSIBLE_MATCH 409, DRAFT/ARCHIVED posting 4xx, FILLED opening 4xx, slot ngoài linked opening 4xx, idempotency replay, idempotency conflict, concurrency race (winner + replay), duplicate application guard, synthetic CCCD round-trip. |

### 4.2 Scope boundaries

- **In:** `app/api/public/jobs/[slug]/applications/route.ts` (modify trên A1 baseline — KHÔNG thay route shape); `src/domains/applications/application.service.ts` (modify `submitPublicApplication` mirror score/case/submit chain, KHÔNG đổi signature hiện có mà A1 đã chốt); `src/domains/applications/apply-helpers.ts` (consume only); `src/domains/applications/public-application.types.ts` (mới — DTO); `src/domains/talent/labor-profile.service.ts` (consume only — reuse `scoreAndClassify`, `createOrMatchLaborProfile`); `src/domains/talent/placement-case.service.ts` (consume only — reuse `openPlacementCase`); `src/shared/integrity/idempotency/**` (consume only); `src/shared/security/rate-limit-guard.ts`, `src/shared/security/request-body.ts`, `src/shared/security/rate-limit-port.ts` (consume only); `prisma/migrations/2026MMDD000000_p1b_public_apply_lifecycle/migration.sql` (đúng một forward-only migration thay body `hrp_public_apply_submission`); `src/domains/applications/marketplace-apply.routes.static.test.ts` (mới hoặc mở rộng nếu đã có — AST guard); `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (mới); targeted unit tests cho `submitPublicApplication`.
- **Out:** `prisma/schema.prisma`; `package.json`; `package-lock.json`; `src/shared/content/job-posting-rich-text/**` (A0/A1-frozen shared profile); `src/shared/ui/editor/**` (A0-owned client editor wrapper); `src/domains/job-board/public.service.ts` (A1-owned); `app/(jobs)/viec-lam/**` (A1-owned); `app/api/public/jobs/route.ts`, `app/api/public/jobs/[slug]/route.ts` (T1A-owned browse); `app/api/public/intake/route.ts`, `src/domains/applications/aff03-public-intake.service.ts`, `prisma/migrations/20260919100000_aff03b_public_intake_rpc/**`, `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill/**` (AFF-03B/C territory, reference only); `prisma/migrations/2026MMDD000000_p1a1_*/**` (A1 forward-only body replacement — consume after A1 ACCEPTED, KHÔNG sửa); `tests/db/aff03-public-intake.integration.test.ts`; `src/domains/applications/aff03-public-intake.service.test.ts`; `src/domains/staffing/job-posting-authoring.service.ts`; `src/domains/talent/intake-writer.service.ts`; `app/api/jobs/apply/route.ts` (DEC-10 retired); `src/domains/job-board/publish.service.ts` (legacy `Project.isPublic`).
- **Allowed task artifacts:** `docs/tasks/hrp-p1-b-public-apply/**` (TASK.md + HANDOFF.md + evidence/).

### 4.3 Domain boundaries

- **Data/state:** Write chain đụng `candidate_submissions` (INSERT), `labor_profiles` (INSERT khi NEW_PROFILE), `placement_cases` (INSERT khi OPEN hoặc REUSE), `application_status_history` (INSERT NULL→'NEW' PUBLIC_APPLY), `idempotency_keys` (wrap service). Read-only qua tracking projection đã có — không sửa. KHÔNG đụng `referral_attributions` (round này chưa mở slug-bound attribution). KHÔNG đụng `Worker`/`SourceClaim`.
- **Permission/security:** Public anon N1 path. SECURITY DEFINER function owner `hrp_public_rpc` (NOLOGIN BYPASSRLS, DEC-14). Route KHÔNG set `app.role` (writer role default). Rate-limit IP trước parse; phone trước transaction. Idempotency-Key UUID required. Body cap 16 KiB. CV non-null 422. Zero PII logging.
- **Interface/API:** `POST /api/public/jobs/[slug]/applications` 201 với DTO đã chốt. `GET /api/public/applications/[trackingCode]` (track read) không đổi contract — chỉ verify field shape.
- **Migration/rollback:** KHÔNG schema change. Đúng một forward-only migration `2026MMDD000000_p1b_public_apply_lifecycle` thay body `hrp_public_apply_submission` (sau A1 migration); giữ exact signature/owner/grants/search_path. Upgrade-path test phải chứng minh atomic chain: PUBLISHED JobPosting + OPEN JobOpening + bound slot → CandidateSubmission gắn LaborProfile + PlacementCase. Rollback atomic nếu OWNER transfer hoặc grants fail (mirror migration `20260823101500_mp2_apply_tracking` lines ~226–258 pattern).

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/applications/public-application.types.ts` (mới) | Định nghĩa DTO `PublicApplyResult & Lifecycle` = `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict }`. DTO `PossibleMatchCandidate { laborProfileId, fullName, normalizedPhone, matchedSignals }`. | `AC-13` | DTO thiếu field / sai kiểu |
| `STEP-02` | `prisma/migrations/2026MMDD000000_p1b_public_apply_lifecycle/migration.sql` (mới, sau A1 ACCEPTED) | Forward-only `CREATE OR REPLACE FUNCTION hrp_public_apply_submission(...)` (giữ signature) thay body để: (a) bảo toàn A1 PUBLISHED/OPEN/slot guard; (b) mirror `scoreAndClassify` (≥2-signal EXACT_MATCH); (c) INSERT `labor_profiles` (NEW_PROFILE) hoặc reuse (EXACT_MATCH) hoặc RAISE `P0014 POSSIBLE_MATCH_NOT_RESOLVED`; (d) INSERT `placement_cases` (status='OPEN') hoặc reuse active case qua partial unique index (savepoint); (e) INSERT `candidate_submissions` với `labor_profile_id` + `placement_case_id` gắn (mirror AFF-03C); (f) INSERT `application_status_history` (NULL→'NEW', reason='PUBLIC_APPLY'). Giữ nguyên signature/owner/grants/search_path theo A1 RQ-08. Thêm table grants tối thiểu: `INSERT/UPDATE labor_profiles`, `INSERT placement_cases`, `SELECT labor_profiles by phone/cccd` (mirror pattern `20260823101500_mp2_apply_tracking` lines ~226–258). | `AC-01`, `AC-02`, `AC-03`, `AC-08`, `AC-12` | Migration sửa migration cũ / đổi signature / thiếu grants |
| `STEP-03` | `src/domains/applications/application.service.ts` `submitPublicApplication` | Modify: (a) consume A1 RPC result khi A1 đã thay body PUBLISHED/OPEN guard; (b) Node-side parallel guard gọi `createOrMatchLaborProfile` (mirror) + `openPlacementCase` để verify verdict + có `candidateSubmissionId`/`laborProfileId`/`placementCaseId` ổn định cho replay; (c) trả DTO đầy đủ 4 identity field + verdict. KHÔNG đổi public function signature cũ. KHÔNG tự sáng tác scoring rule. KHÔNG fork Node-side `scoreAndClassify`. | `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-08`, `AC-13` | Service đổi signature cũ / fork scoring / fork openPlacementCase |
| `STEP-04` | `app/api/public/jobs/[slug]/applications/route.ts` (modify trên A1 baseline) | Giữ nguyên route shape A1 đã chốt (reject browser `slotId`/`projectId`/`jobOpeningId`). Wrap `submitPublicApplication` với `withIdempotency`. Map error codes: `POSSIBLE_MATCH_NOT_RESOLVED` → 409 + candidate list; `DUPLICATE_APPLICATION` → 409; `IDEMPOTENCY_CONFLICT` → 409; `JOB_NOT_AVAILABLE` (A1) → 4xx. KHÔNG mở CV upload; KHÔNG log raw PII. | `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-09`, `AC-11` | Route mở browser slotId / log PII / bỏ idempotency wrap |
| `STEP-05` | `src/domains/applications/marketplace-apply.routes.static.test.ts` (mới hoặc mở rộng) | AST/string detector mở rộng cho slug-bound apply route + service: (a) KHÔNG tự thêm cột/fork node rich-text; (b) KHÔNG mở CV upload; (c) KHÔNG mở legacy `/api/jobs/apply`; (d) DTO include đúng 4 identity field; (e) KHÔNG log raw fullName/phone/cccd; (f) KHÔNG bỏ rate-limit guard trước parse. | `AC-13` | Static test giả tạo allow violation |
| `STEP-06` | `tests/db/p1b-public-apply-slug-bound.integration.test.ts` (mới, Neon container-DB, runtime-role lane KHÔNG set `app.role` GUC) | Integration test mirror `aff03-public-intake.integration.test.ts`: (a) happy path PUBLISHED+OPEN+bound slot → NEW CandidateSubmission gắn LaborProfile + PlacementCase; (b) EXACT_MATCH reuse LaborProfile; (c) NEW_PROFILE first time; (d) POSSIBLE_MATCH 409; (e) DRAFT/ARCHIVED JobPosting 4xx; (f) FILLED JobOpening 4xx; (g) slot ngoài linked opening 4xx; (h) idempotency replay; (i) idempotency conflict; (j) concurrency race (winner + replay); (k) duplicate application guard; (l) synthetic CCCD round-trip. | `AC-01`..`AC-12` | Test fail / leak / race regression |
| `STEP-07` | Gate evidence | `npx prisma validate`; `npm run typecheck`; `npm run lint`; `npm run test:unit`; `npm run test:integration`. | tất cả AC | Gate fail |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Happy path: `POST /api/public/jobs/[slug]/applications` với PUBLISHED JobPosting + OPEN JobOpening + bound slot + valid synthetic applicant → 201 với `{ trackingCode, status, candidateSubmissionId, laborProfileId, placementCaseId, verdict: 'NEW_PROFILE' }`. INSERT đúng 1 row `candidate_submissions` (laborProfileId NOT NULL, placementCaseId NOT NULL), INSERT 1 row `labor_profiles` (NEW_PROFILE), INSERT 1 row `placement_cases` (status='OPEN'), INSERT 1 row `application_status_history` (NULL→'NEW' PUBLIC_APPLY). | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts` (runtime-role lane); assert DB state qua Prisma. |
| `AC-02` | EXACT_MATCH scenario: 2nd applicant với same normalized_phone + ≥1 signal nữa → cùng `LaborProfileId` (reuse), mới `placementCaseId` nếu lần đầu trên profile đó (hoặc reuse active case qua partial unique index nếu đã có). INSERT `candidate_submissions` mới; không INSERT `labor_profiles` mới. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert DB state. |
| `AC-03` | NEW_PROFILE first-time applicant → INSERT mới `labor_profiles` + INSERT `placement_cases` + INSERT `candidate_submissions` gắn đúng 2 FK. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert DB state. |
| `AC-04` | POSSIBLE_MATCH chỉ match 1 signal → 409 POSSIBLE_MATCH_NOT_RESOLVED + candidate list. KHÔNG INSERT `labor_profiles`/`placement_cases`/`candidate_submissions`. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert error code + DB state unchanged. |
| `AC-05` | Duplicate application guard: same `slotId` + same `normalizedPhone` + status NOT IN ('REJECTED','WITHDRAWN') → 409 DUPLICATE_APPLICATION. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert error code P0012 mapping. |
| `AC-06` | Idempotency replay: same idempotency key + same payload → stored result (cùng `candidateSubmissionId` + `laborProfileId` + `placementCaseId` + `verdict`). | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert DB row count + replay response. |
| `AC-07` | Idempotency conflict: same idempotency key + different payload → 409 IDEMPOTENCY_CONFLICT (không phải 500). | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert error code P0010 mapping. |
| `AC-08` | Concurrency race: 2 transactions với same idempotency key đồng thời → exactly 1 INSERT `candidate_submissions` (winner), transactions còn lại replay stored row. Savepoint + unique violation re-check. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert DB row count + replay. |
| `AC-09` | DRAFT/ARCHIVED JobPosting → 4xx với error code pipeline (A1 đã đặt); FILLED JobOpening → 4xx; slot ngoài linked JobOpening → 4xx. KHÔNG INSERT LaborProfile/PlacementCase/CandidateSubmission. KHÔNG bypass qua Node pre-read. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts`; assert error code + DB state unchanged. |
| `AC-10` | Atomic PUBLISHED/OPEN/slot guard: Node pre-read thấy PUBLISHED nhưng posting bị unpublish trước RPC → RPC vẫn fail closed. SECURITY DEFINER function resolve/revalidate atomically. | `npm run test:integration tests/db/p1b-public-apply-slug-bound.integration.test.ts` với race fixture; assert error. |
| `AC-11` | Rate-limit + body cap + shape gate giữ nguyên invariant A1: APPLY_IP chặn TRƯỚC parse body (`req.bodyUsed === false`); APPLY_PHONE chặn TRƯỚC transaction; body 16 KiB → 413; media-type != application/json → 415; shape sai → 400; CV non-null → 422 CV_UPLOAD_DISABLED. | `npm run test:unit -- src/domains/applications/marketplace-apply.routes.static.test.ts` + `npm run test:integration`; mirror assertion pattern `marketplace-apply.routes.test.ts` lines ~80+. |
| `AC-12` | Migration #2 của B thay body `hrp_public_apply_submission` giữ exact signature/owner/grants/search_path. Function replacement atomic; rollback atomic nếu assertion fail. Thêm table grants tối thiểu: `INSERT/UPDATE labor_profiles`, `INSERT placement_cases`, `SELECT labor_profiles by phone/cccd`. | Upgrade-path integration: migrate tới predecessor (sau A1 ACCEPTED) → seed synthetic fixtures → apply B migration → catalog assertions + negative rollback fixture; `npm run test:integration`. |
| `AC-13` | DTO đúng 4 identity field Owner duyệt (`candidateSubmissionId`, `laborProfileId`, `placementCaseId`, `verdict`) + `trackingCode` + `status`. KHÔNG leak `referrerUserId`/`attributionId`/`referralAttributionId`. KHÔNG echo raw fullName/phone/cccd ra response. | `npm run test:unit -- src/domains/applications/marketplace-apply.routes.static.test.ts`; `rg -F "referrerUserId" src/domains/applications/application.service.ts app/api/public/jobs` = 0 hit trong response path; AST guard DTO shape. |
| `AC-14` | KHÔNG fork shared rich-text profile; P1-B chỉ consume `src/shared/content/job-posting-rich-text/**`. KHÔNG sửa `prisma/schema.prisma`, `package.json`, `package-lock.json`, `app/(jobs)/viec-lam/**`, `src/domains/job-board/public.service.ts`, `src/shared/ui/editor/**`, `app/api/jobs/apply/route.ts`, `app/api/public/intake/route.ts`, migration A0/A1/AFF-03B/AFF-03C. | `git status --porcelain` chỉ chứa in-scope roots §0; `git diff --cached --stat src/shared/content/job-posting-rich-text` = 0 hit; `git diff --cached --stat prisma/schema.prisma package.json package-lock.json` = 0 hit. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02`, `STEP-03`, `STEP-04`, `STEP-06` | `AC-01`, `AC-09`, `AC-10` |
| `RQ-02` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-02`, `AC-03`, `AC-04` |
| `RQ-03` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-01`, `AC-02`, `AC-08` |
| `RQ-04` | `STEP-02`, `STEP-03`, `STEP-06` | `AC-01`, `AC-02`, `AC-03` |
| `RQ-05` | `STEP-02`, `STEP-07` | `AC-12` |
| `RQ-06` | `STEP-04`, `STEP-06` | `AC-06`, `AC-07` |
| `RQ-07` | `STEP-02`, `STEP-06` | `AC-05` |
| `RQ-08` | `STEP-01`, `STEP-03`, `STEP-05`, `STEP-06` | `AC-13` |
| `RQ-09` | `STEP-04`, `STEP-05`, `STEP-06` | `AC-11` |
| `RQ-10` | `STEP-06` | `AC-01`, `AC-02`, `AC-03`, `AC-04` |
| `RQ-11` | `STEP-02`, `STEP-03`, `STEP-04`, `STEP-07` | `AC-14` |
| `RQ-12` | `STEP-04`, `STEP-05` | `AC-13` |
| `RQ-13` | `STEP-05`, `STEP-07` | `AC-11`, `AC-13`, `AC-14` |
| `RQ-14` | `STEP-06`, `STEP-07` | `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AC-06`, `AC-07`, `AC-08`, `AC-09`, `AC-10`, `AC-11`, `AC-12` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Public anon N1 apply không gắn LaborProfile/PlacementCase (legacy MP-2 cut). | Mirror AFF-03B pattern trong RPC body (score + INSERT + case open); B consume `createOrMatchLaborProfile` + `openPlacementCase` ở Node-side parallel guard. Test `AC-01`..`AC-04`. |
| `RISK-02` | Race 2 transactions cùng idempotency key dẫn đến duplicate INSERT. | Savepoint + unique violation re-check trong RPC + `withIdempotency` wrap. Test `AC-08`. |
| `RISK-03` | Duplicate application cùng slot + same phone bypass. | Partial unique guard slot+phone ở RPC + status NOT IN ('REJECTED','WITHDRAWN'). Test `AC-05`. |
| `RISK-04` | PII leak trong response/telemetry. | DTO chỉ 4 identity field Owner duyệt; `maskPhone`/`maskCccd` ở tracking; structured logging chỉ route/outcome/verdict. Test `AC-13` + static AST guard. |
| `RISK-05` | T1B vô tình fork shared rich-text profile hoặc sửa schema/package. | Forbidden paths §0 + `git diff --stat` 3 path đó; static guard `AC-14`. |
| `RISK-06` | Migration thay body `hrp_public_apply_submission` đổi signature/owner/grants/search_path. | Mirror `20260823101500_mp2_apply_tracking` lines ~226–258 pattern; catalog assertion `AC-12`; rollback atomic. |
| `RISK-07` | Node pre-read thấy PUBLISHED nhưng posting bị unpublish trước RPC; hồ sơ vẫn lọt qua Project legacy authority. | KHÔNG dùng Node pre-read làm authority. SECURITY DEFINER function resolve/revalidate JobPosting+JobOpening+slot trong cùng transaction (consume A1 DEC-10). Test `AC-10`. |
| `RISK-08` | T1B vô tình mở `referral_attributions` cho slug-bound apply trước khi Owner chốt policy. | Forbidden paths §0 + RQ-12 + static AST guard `AC-13`. OD chờ §8. |
| `RISK-09` | T1B fork `src/domains/talent/labor-profile.service.ts` thay vì consume. | Read-only consumption; nếu cần helper mới thì mở task additive riêng. RQ-11 + `AC-14`. |
| `RISK-10` | A1 ACCEPTED ở baseline khác baseline evolution `91525013f` mà T1B chưa pin. | P1-B chỉ bắt đầu code sau khi A1 ACCEPTED tại baseline evolution đã chốt; nếu A1 rebase thì P1-B re-pin baseline round mới. Baseline §0 đã pin `91525013f`; A1 baseline evolution sẽ được track trong HANDOFF.md. |

## 8. Open Questions

| ID | Question | Decision deadline |
|---|---|---|
| `OQ-01` | `OD cho slug-bound apply + referral attribution`: (a) P1-B KHÔNG đọc `hrp_aff` cookie trong thin-slice, hoặc (b) mở rộng RPC để nhận `referral_attribution_id` mirror AFF-03B. Round này B chọn (a) — KHÔNG mở slug-bound attribution — và để OD chờ Owner round sau. | Owner round review tiếp theo (sau T0 contract review). |
| `OQ-02` | Storage layout helper RPC: replace body `hrp_public_apply_submission` (signature cũ) hay tạo `hrp_public_apply_submission_v2(jsonb)` cùng owner? Đề xuất: replace body (mirror AFF-03B). | T0 contract review. |
| `OQ-03` | EXACT_MATCH signal set: hiện ≥2-signal mirror `src/domains/talent/labor-profile.service.ts:164-168` (normalized phone + ít nhất một signal nữa). Nếu Owner muốn thu hẹp chỉ `(phone + cccd)`, B sẽ thêm option constant. Round này mirror nguyên AFF-03B. | Owner round review (optional, không block). |

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| 1 | Revision documentation-only v1.0: chốt boundary A1↔B (§3), chốt OD-P1B-* (§3 + DEC-*), chốt Build vs Adopt = ADOPT (§3.1), chốt Build vs Automate = N/A (§3.2), chốt migration forward-only (§4.3 + DEC-04), chốt DTO 4 identity field (DEC-07), chốt dual idempotency (DEC-05), chốt duplicate guard (DEC-06), chốt rate-limit + 16 KiB + CV gate giữ nguyên (RQ-09), chốt synthetic CCCD (DEC-11), chốt 14 RQ + 14 AC + 14 STEP, status `PROPOSED_ONLY`, contract gate `DRAFT`, decision state `CLOSED`, next gate `WAIT_P1_A1_ACCEPTED`, audit `LIGHT`. Test environment `NOT_REQUIRED` vì round này doc-only. Chưa vào `READY_TO_CODE`. | Bám V2 fast-freeze; tận dụng authority A0 ACCEPTED + A1 v1.2 đã đối chiếu; không mở thêm OD mới ngoài §8 đã chờ Owner. |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-09-25` | Initial contract tại planning commit `91525013fc2720a3803e808baac39e1c4497daf6` (T0 directive). RECONCILIATION companion `docs/discovery/realignment/P1B_PUBLIC_APPLY_RECONCILIATION.md` v1.0 (đã đối chiếu capability matrix, OD đề xuất, BUILD_VS_ADOPT, BUILD_VS_AUTOMATE). Contract locks: status `PROPOSED_ONLY`; contract gate `DRAFT`; decision state `CLOSED`; test environment `NOT_REQUIRED` (round này doc-only); correction budget 1; audit lane `CRITICAL` + audit mode `LIGHT` với recorded risk acceptance; in-scope roots khóa đúng 1 forward-only migration + route/service modify trên A1 baseline + DTO mới + integration test mới; forbidden paths đối chiếu T1A territory; 14 RQ → 14 STEP → 14 AC traceability; 10 risk + 10 mitigation; 3 OD chờ Owner §8. Không code/install/migration/runtime. | Bám V2 + chốt thin-slice ownership cho P1-B. |
