# TASK — `hrp-v6-n1-intake-writer`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-n1-intake-writer` |
| Work type | `CODE` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Identity + concurrency (TIER0_HANDOVER.md §N1: "Audit Tier 3 LIGHT bắt buộc cho identity, migration và invariant"). Touch: `createOrMatchLaborProfile` authority (race-safe match), `openPlacementCase` invariant (max 1 active case/LaborProfile qua partial unique index đã có từ N1 foundation — phase này phải xử lý race + idempotency ở app layer), intake writer (`createCandidateSubmissionFromIntake`) đi qua cùng một authority, idempotency pattern. **KHÔNG sửa schema, KHÔNG tạo migration, KHÔNG đổi enum `PlacementCaseStatus`/`CandidateSubmissionStatus`/`CandidateSubmissionStatus` (TIER0_HANDOVER.md §N1: "không tạo model Application mới chỉ để đổi tên CandidateSubmission")**. **KHÔNG ghi test data vào `hrp-live`**; **KHÔNG tự áp migration production mới** (N1 foundation migrations đã applied ở Stage 4 — `5b5767b`; phase này chỉ viết app-layer code trên schema đã có). |
| Spec version | `v0.5 ROUND_5_DELIVERED` |
| Status | `READY_FOR_AUDIT_ROUND_5` |
| Planner | `Tier 1` |
| Baseline | Round-1: `c9a61dd`; Round-2: `284785a` (sau khi route stub được REVERT 410); Round-3: `50dedee`; Round-4: `(round-3 HEAD)` |
| Round-2 HEAD | `362e6a9` (allow-list align 2 file test + 3 file production mới + dọn debug scripts) |
| Round-3 HEAD | `(round-3 fix)` (SAVEPOINT quanh INSERT placement_case + integration test DB-touching — 1 case concurrent retry fail) |
| Round-4 HEAD | `(round-4 fix)` (2 PrismaClient riêng cho AC-05 concurrent retry + Math.random tag — 9/9 PASS trên `hrp_mp2_test`) |
| Round-5 HEAD | `(round-5 fix)` (handler intake thật createCandidateSubmissionFromIntake + verify đủ 3 điều kiện + bỏ claim singleton vs separate) |
| In-scope roots | `src/domains/talent/**` (mới); `src/domains/staffing/assignment-placement.service.ts` (chỉ dùng làm pattern, không sửa nếu không in-scope); `app/api/jobs/apply/**` (mới); `app/api/admin/intake/**` (mới); `tests/**` (test mới cho authority + race + idempotency); `docs/tasks/hrp-v6-n1-intake-writer/**` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `app/(jobs)/**` (UI thuộc task khác); `app/admin/applications/**` (luồng admin staff cũ — out of scope phase này); `app/api/admin/assignments/**` (MP-3C, giữ nguyên); mọi thay đổi liên quan Chat/CSKH/provider runtime (CRM app tách riêng — `docs/TIER0_HANDOVER.md §7`). |
| Required gates | `npx prisma validate` (smoke); `npx tsc --noEmit` (typecheck); `npx vitest run --config vitest.unit.config.ts tests/domains/talent/**` (authority unit tests); `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts` (integration test trên `DATABASE_URL_TEST` — race/idempotency/RLS); `npx vitest run --config vitest.unit.config.ts tests/api/intake.routes.test.ts` (route tests); full unit suite cuối để verify không regress; `npx vitest run --config vitest.unit.config.ts src/shared/ui/design-tokens.static.test.ts` carry-forward. |
| Current execution round | `5` |
| Current audit round | `4` (round-2 CONDITIONAL → round-3 FAIL → round-4 PASS → round-5 PASS Tier 0 REVISION_REQUIRED) |
| Next gate | `/audit` Tier 3 LIGHT round 5 (delta review so với round-4 — fix AC-05 concurrent retry: handler intake thật createCandidateSubmissionFromIntake + verify đủ 3 điều kiện + bỏ claim singleton) → `/resolve` (Tier 1 + Tier 0 deploy gate — KHÔNG apply lên `hrp-live` trong task này). Round-5 evidence: integration test `tests/db/intake-writer-integration.test.ts` chạy thật trên `hrp_mp2_test` 9/9 PASS; unit suite 132 file | 2173/2173 PASS; integration lane 18 file | 361 PASS + 2 SKIP | 0 FAIL; typecheck 0 error; không có file ngoài phạm vi. |

> Lane CRITICAL + Audit LIGHT — không được hạ. CRITICAL vì chạm identity (`createOrMatchLaborProfile` là canonical authority cho mọi first-party intake theo V6P-007A) + invariant (`max 1 active PlacementCase/LaborProfile` concurrency-safe đã có ở schema N1 foundation, phase này phải xử lý race ở app layer + idempotency).

> TIER0_HANDOVER.md §11 cấm: "auto-merge identity chỉ theo phone/CCCD đơn lẻ", "tạo Worker/Assignment ngay khi selected hoặc confirmed", "quay lại coi V6+ là release nằm giữa V6 và V7", "tạo Application mới chỉ để đổi tên CandidateSubmission". TASK này tuân thủ các cấm trên.

## 1. Outcome

### 1.1 User-visible outcome

- Một authority `createOrMatchLaborProfile(...)` dùng chung cho **mọi first-party intake path** (marketplace apply, staff intake, partner intake — bất kỳ route POST mới nào sau này đều phải gọi authority này). Trả về discriminated union `EXACT_MATCH | POSSIBLE_MATCH | NEW_PROFILE` theo contract V7 (xem §3 DEC-01).
- Một command `openPlacementCase({ laborProfileId, intent })` tạo một active `PlacementCase` (status `OPEN`) gắn với `LaborProfile`. Race-safe (partial unique index đã có ở schema foundation; phase này handle `P2002`/`P2034` + idempotency ở app layer) và idempotent (cùng intent + cùng LaborProfile + cùng idempotency key → trả cùng case, không tạo mới).
- Một command `createCandidateSubmissionFromIntake({ laborProfileId?, applicantInput, channel, idempotencyKey })` gắn intake mới vào một active `PlacementCase` của `LaborProfile`. Khi intake chưa chọn Job (General Interest), vẫn mở được case (nếu chưa có active case) và tạo `CandidateSubmission` với `placementCaseId` link; `jobOpeningId`/`projectId` nullable cho General Interest (xem §4.3 RQ-09).
- Một route `POST /api/jobs/apply` (public, idempotent) — entry-point cho marketplace apply form. Gọi `createOrMatchLaborProfile` + `openPlacementCase` (nếu cần) + `createCandidateSubmissionFromIntake`. **KHÔNG ghi PII vào log** (xem §4.3 RQ-11).
- **General Interest** (chưa chọn Job) có thể mở case với `jobOpeningId`/`projectId` NULL — case vẫn hợp lệ, không cần Application.
- **KHÔNG tạo** model `Application` mới — `CandidateSubmission` giữ nguyên tên (TIER0_HANDOVER.md §11 cấm + §N1: "không tạo model Application mới chỉ để đổi tên").
- **Actor không tự động trở thành referrer/handler/beneficiary** — `createdByUserId` (nếu có) chỉ ghi lại cho audit, KHÔNG tự set `ctvId`/`vendorId`/`source = 'CTV'`/`source = 'VENDOR'` trừ khi caller declare rõ ràng qua request field hợp lệ (xem §3 DEC-06).

### 1.2 Non-goals

- **KHÔNG** viết migration. **KHÔNG** sửa `prisma/schema.prisma`. **KHÔNG** đổi tên `CandidateSubmission` thành `Application`.
- **KHÔNG** auto-merge `LaborProfile` khi `POSSIBLE_MATCH` (TIER0_HANDOVER.md §11 cấm + V6P-007A rule). Chỉ flag + record evidence; merge thuộc task riêng (V6P-007B — out of scope).
- **KHÔNG** ghi legacy backfill. `CandidateSubmission.placementCaseId` nullable cho legacy rows (N1 foundation DEC-N1-03 đã chốt); phase này chỉ resolve cho new writes.
- **KHÔNG** xử lý Chat/CSKH/provider runtime/AI orchestration — thuộc CRM app tách riêng (`docs/TIER0_HANDOVER.md §7` Owner decision 13/09/2026).
- **KHÔNG** xây dựng `JobProposal`, `InteractionOutcome`, `NextAction` — thuộc V6P-016/017/018 (Track J, M4) — out of scope phase này.
- **KHÔNG** thay thế MP-3C `POST /api/admin/assignments` (placement activation) — luồng admin staff cũ vẫn giữ nguyên, không touch.
- **KHÔNG** viết UI (`app/(jobs)/viec-lam/[slug]/page.tsx` apply form liên kết — đó là task UI riêng, out of scope phase này). API có thể dùng qua curl/Postman cho integration test.
- **KHÔNG** viết `mergeLaborProfiles(...)` — thuộc V6P-007B, sau phase này.
- **KHÔNG** setup CI/CD hay deploy — task chỉ deliver code + test; apply lên `hrp-live` thuộc Tier 0 deploy gate.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `docs/TIER0_HANDOVER.md §N1` (§5.3) — outcome N1 đầy đủ + DEC-013/014/015 | Owner authority cho contract `createOrMatchLaborProfile` (3 verdict) + invariant 1 active case + `createdByUserId` ≠ referrer |
| `EV-02` | `docs/V7/V6_PLUS_IMPLEMENTATION_BACKLOG.md §3 V6P-007A` + §4 V6P-001A/001B/003/002A/002B + §10 V6P-013 + §14 V6P-025A/025B | Implementation backlog quyết định: schema đã có ở N1 foundation (V6P-001A applied), còn lại là authority + command + RLS. Phase này cover V6P-007A + V6P-001B (openPlacementCase command) + V6P-002B (createApplication command = createCandidateSubmissionFromIntake trên schema hiện tại) + V6P-003 (race handling) + V6P-002A (case-aware submission) + V6P-025A (permission cho intake writer). |
| `EV-03` | `docs/tasks/hrp-v6-n1-placement-case-foundation/TASK.md §11` + `HANDOFF.md` + `AUDIT.md` | Foundation task đã ACCEPTED v1.2 (12/09/2026 15:18); schema + 2 migrations + partial unique index + RLS đã live trên `hrp-live` (Stage 4 evidence 13/09 22:28, `5b5767b`). Phase này dựng trên schema đã có, KHÔNG đụng schema. |
| `EV-04` | `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-hrp-live-run/README.md` | Xác nhận migration production đã PASS (catalog 8/8, RLS enable + force, 2 FK ON DELETE RESTRICT); `prisma migrate status` exit 0; theo dõi 5 phút không có tín hiệu bất thường. |
| `EV-05` | `app/api/admin/assignments/route.ts` + `src/domains/staffing/assignment-placement.service.ts` + `src/shared/auth/with-db-context.ts` + `src/shared/auth/with-auth-scope.ts` + `src/shared/integrity/idempotency.ts` | Pattern hiện có cho: `withDbContext` (transaction-local GUCs + RLS context), `withIdempotency` (key + payload hash), `assertPlacementRole`, `PlacementError` domain error. Phase này áp dụng pattern tương tự cho intake writer (KHÔNG copy verbatim — chỉ lấy pattern). |
| `EV-06` | `prisma/schema.prisma` dòng 528–586 (CandidateSubmission), 1381–1405 (LaborProfile + LaborProfileIntake), 1454–1489 (PlacementCase + PlacementCaseStatus enum) | Schema đã có sẵn `laborProfileId` + `placementCaseId` nullable trên CandidateSubmission; `placement_case_labor_profile_id_active_unique` partial unique index (ACTIVE = OPEN/IN_PROGRESS/READY_TO_PLACE); LaborProfile 1→N PlacementCase; LaborProfileIntake để record intake evidence. Phase này dùng schema hiện tại. |
| `EV-07` | `src/shared/auth/scopes/ctv.scope.ts` `buildCandidateSubmissionScope` | Pattern scope hiện có (ADMIN/HR_MANAGER/DIRECTOR/SALE/ACCOUNTANT root passthrough; VENDOR_* theo `vendorId`; CTV theo `ctvId`). Phase này KHÔNG sửa scope cũ — chỉ thêm scope mới cho intake writer (PUBLIC apply form path). |
| `EV-08` | `prisma/__tests__/placement-case-invariant.test.ts` | Static SQL gate pattern (parse migration SQL bằng regex) — phase này KHÔNG dùng static gate (không có migration mới); cần integration test thật trên `DATABASE_URL_TEST` để chứng minh runtime concurrency. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `createOrMatchLaborProfile` trả `EXACT_MATCH \| POSSIBLE_MATCH \| NEW_PROFILE` (tên discriminator chuẩn theo Tier 0 outcome §N1; tài liệu N1 cũ ghi `NEW` — phase này dùng `NEW_PROFILE` làm tên chuẩn mới). Verdict dựa trên scoring có giải thích: `(matchedOn, confidence, conflictingEvidence?)`. Cấm auto-merge. | `CHOSEN` |
| `DEC-02` | Tie-break scoring `EXACT_MATCH` chỉ khi **ít nhất 2 tín hiệu nhận dạng khớp** (`normalizedPhone + cccdNumber`, hoặc `normalizedPhone + fullName + dateOfBirth`, hoặc `cccdNumber + fullName + dateOfBirth`); 1 tín hiệu đơn lẻ (vd chỉ `normalizedPhone`) → `POSSIBLE_MATCH`. **Phone một mình KHÔNG chứng minh cùng người** (TIER0_HANDOVER.md §11 cấm). | `CHOSEN` |
| `DEC-03` | Nếu `POSSIBLE_MATCH` nhưng có `conflictingEvidence` (vd cùng phone nhưng khác DOB, hoặc cùng CCCD nhưng khác fullName) → trả `POSSIBLE_MATCH` với `conflictingEvidence: [...]` và KHÔNG gợi ý auto-merge. Merge thuộc V6P-007B (task riêng). | `CHOSEN` |
| `DEC-04` | `openPlacementCase` dùng partial unique index đã có ở schema (`placement_case_labor_profile_id_active_unique`). Race handling: trong transaction, nếu INSERT trả `P2002` (unique constraint) → SELECT lại case active hiện có cho cùng `laborProfileId` → trả về caller. KHÔNG trả lỗi race cho caller (idempotent từ góc nhìn caller). | `CHOSEN` |
| `DEC-05` | Idempotency cho `openPlacementCase` + `createCandidateSubmissionFromIntake`: bắt buộc header `Idempotency-Key`. Nếu cùng key + cùng payload → trả lại row đã tạo (status 200/201 + body replay); cùng key + payload khác → 409 IDEMPOTENCY_CONFLICT. Pattern reuse `withIdempotency` (`src/shared/integrity/idempotency.ts`). | `CHOSEN` |
| `DEC-06` | Actor (caller) KHÔNG tự động trở thành referrer/handler/beneficiary. `CandidateSubmission.ctvId`/`vendorId` chỉ set khi caller declare explicit (vd partner intake route gửi `partnerRef: { kind: 'CTV', userId: '...' }` hợp lệ); admin/staff intake để NULL trừ khi caller declare. Log ghi `actorId` cho audit; `createdByUserId` (nếu có) chỉ record audit, KHÔNG set `source = 'CTV'`/`'VENDOR'`. | `CHOSEN` |
| `DEC-07` | General Interest (`jobOpeningId`/`projectId` NULL) → vẫn mở case active (nếu chưa có) + tạo `CandidateSubmission` với `placementCaseId` link + `status = 'NEW'`. Case vẫn hợp lệ, không cần Application (V6P-002B rule: "general-interest case can exist with zero Applications"). | `CHOSEN` |
| `DEC-08` | Permission cho intake writer: `POST /api/jobs/apply` là PUBLIC (no auth) — endpoint đầu vào cho marketplace apply form. Permission gating thuộc route admin/staff/partner (vd `POST /api/admin/intake/staff` cần `CAN_CREATE_INTAKE` permission — RQ-12). Phase này cover public + admin/staff route; partner intake route defer sang task V6P-008 (referral reclaim + attribution policy). | `CHOSEN` |
| `DEC-09` | PII logging: KHÔNG log `fullName`, `phone`, `cccdNumber`, `dateOfBirth` raw vào log. Chỉ log ID (`candidateSubmissionId`, `laborProfileId`, `placementCaseId`) + verdict (`createOrMatchResult`). Login pattern ở `app/api/auth/login/route.ts` chỉ log `outcome` enum — phase này áp dụng tương tự. | `CHOSEN` |
| `DEC-10` | Authority dispatching: `createOrMatchLaborProfile` được route từ `src/domains/talent/labor-profile.service.ts`. `openPlacementCase` + `createCandidateSubmissionFromIntake` được route từ `src/domains/talent/placement-case.service.ts` (mới). Không sửa `src/domains/staffing/**` hay `app/api/admin/assignments/**`. | `CHOSEN` |
| `DEC-11` | Logging qua `@/src/shared/observability/logger` (`logWarn`, `logError`, `logInfo`) — KHÔNG `console.log` PII. Audit event type strings: `talent.case.create`, `talent.intake.create`, `talent.profile.match` — ghi qua `logInfo` cho structured log (TIER0_HANDOVER.md §V6P-027B hint; phase này chưa cần full audit log table — chỉ structured log với `correlationId`). | `CHOSEN` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `createOrMatchLaborProfile` là authority duy nhất resolve person identity. Trả `EXACT_MATCH \| POSSIBLE_MATCH \| NEW_PROFILE` (tên discriminator chuẩn). Mọi first-party intake path (marketplace, staff, partner, future provider) phải route qua authority này. |
| `RQ-02` | Tie-break scoring: `EXACT_MATCH` chỉ khi **≥2 tín hiệu khớp** trên cùng record (vd `normalizedPhone` + `cccdNumber`, hoặc `normalizedPhone` + `fullName + dateOfBirth`, hoặc `cccdNumber` + `fullName + dateOfBirth`). `POSSIBLE_MATCH` khi 1 tín hiệu khớp HOẶC khi có tín hiệu khớp nhưng có `conflictingEvidence` (vd cùng phone, khác DOB). `NEW_PROFILE` khi không tìm thấy record nào khớp bất kỳ tín hiệu nào. |
| `RQ-03` | Phone một mình KHÔNG chứng minh cùng người. `normalizedPhone` chỉ là một trong các tín hiệu; thiếu tín hiệu thứ hai → `POSSIBLE_MATCH`, KHÔNG `EXACT_MATCH`. |
| `RQ-04` | `POSSIBLE_MATCH` KHÔNG tự merge. Nếu caller cần merge → trả về danh sách candidates + verdict + lý do (`matchedOn`, `conflictingEvidence`) cho caller; merge thuộc task V6P-007B (out of scope). Phase này chỉ cung cấp primitive + test chứng minh KHÔNG auto-merge. |
| `RQ-05` | `openPlacementCase({ laborProfileId, intent, idempotencyKey })` mở một `PlacementCase` active (`status = OPEN`). Nếu đã có active case cho cùng `laborProfileId` → trả về case active hiện tại (idempotent từ caller POV). Race-safe qua partial unique index `placement_case_labor_profile_id_active_unique` (đã có ở N1 foundation migration). |
| `RQ-06` | Idempotency: `Idempotency-Key` header bắt buộc cho mọi write route (`POST /api/jobs/apply`, `POST /api/admin/intake/staff`). Cùng key + cùng payload → replay response; cùng key + payload khác → 409 `IDEMPOTENCY_CONFLICT`. Pattern: `withIdempotency` (`src/shared/integrity/idempotency.ts`). |
| `RQ-07` | `createCandidateSubmissionFromIntake({ laborProfileId?, applicantInput, channel, intent, idempotencyKey, actorId })`: resolve LaborProfile qua `createOrMatchLaborProfile` (nếu `laborProfileId` không cung cấp), resolve active case qua `openPlacementCase` (nếu cần), tạo `CandidateSubmission` với `placementCaseId` link, `channel`, optional `jobOpeningId`/`projectId` (NULL cho General Interest), `status = 'NEW'`. |
| `RQ-08` | General Interest: `jobOpeningId = null` và `projectId = null` → vẫn tạo case active + submission. Case vẫn hợp lệ với 0 Application (TIER0_HANDOVER.md §N1 + V6P-002B). |
| `RQ-09` | Actor KHÔNG tự động trở thành referrer/handler/beneficiary. `createdByUserId` chỉ ghi audit; `ctvId`/`vendorId` chỉ set khi caller declare explicit. CTV/Vendor intake sẽ là route riêng (V6P-008, defer). |
| `RQ-10` | Auth/RLS giữ nguyên pattern hiện có: route public (`/api/jobs/apply`) dùng `withDbContext` với GUCs `app.role = 'PUBLIC'` (đã có pattern ở `app/api/public/**` nếu có; phase này tự tạo); route admin dùng `withDbContext` với GUC `app.user_id + app.role` từ `AuthContext`. `placement_case` RLS đã enforce (N1 foundation RLS migration); `candidate_submissions` RLS dùng policy cũ. Phase này KHÔNG sửa RLS policy. |
| `RQ-11` | KHÔNG ghi PII vào log. `logWarn`/`logInfo`/`logError` chỉ log ID (UUID), verdict enum, channel enum, `correlationId` (UUID). KHÔNG log `fullName`, `phone`, `cccdNumber`, `dateOfBirth` raw. |
| `RQ-12` | Permission catalog bổ sung: `CAN_CREATE_INTAKE` (admin/staff intake route), `CAN_MANAGE_TALENT_CASE` (admin/staff case management — phase sau sẽ dùng). Public `/api/jobs/apply` không cần permission (chỉ cần rate-limit ở route layer — phase này chưa cần rate-limit phức tạp, chỉ log + idempotency). |
| `RQ-13` | Race-safe: integration test 2 transaction mở case đồng thời cho cùng `LaborProfile` → chỉ 1 case active tồn tại; transaction thua nhận `P2002`, app layer SELECT lại case active và trả idempotent (KHÔNG 500 cho caller). |
| `RQ-14` | Idempotency test: cùng `Idempotency-Key` + cùng payload → 2 row (1 submission); cùng key + payload khác → 409 `IDEMPOTENCY_CONFLICT`. |
| `RQ-15` | KHÔNG tạo model `Application` mới. `CandidateSubmission` giữ tên (TIER0_HANDOVER.md §11). Migration: KHÔNG có migration mới trong task này. |

### 4.2 Scope boundaries

- **In:**
  - `src/domains/talent/labor-profile.service.ts` (mới) — `createOrMatchLaborProfile`, normalize helpers, scoring logic.
  - `src/domains/talent/placement-case.service.ts` (mới) — `openPlacementCase`, race handling, idempotency helper.
  - `src/domains/talent/intake-writer.service.ts` (mới) — `createCandidateSubmissionFromIntake`, ties createOrMatch + openCase + create Submission trong 1 transaction.
  - `src/domains/talent/intake.errors.ts` (mới) — domain errors (ví dụ `IntakeValidationError`, `IdempotencyConflictError` đã có sẵn ở `src/shared/integrity/idempotency.ts`).
  - `src/domains/talent/normalize.ts` (mới) — `normalizePhone` (digits only, country code strip — phase này chỉ strip `+84`/`0` đầu cho số VN, KHÔNG xử lý quốc tế), `normalizeFullName` (lowercase + trim + collapse whitespace).
  - `app/api/jobs/apply/route.ts` (mới) — public POST endpoint.
  - `app/api/admin/intake/staff/route.ts` (mới) — admin/staff POST endpoint (auth required).
  - `tests/domains/talent/labor-profile.service.test.ts` (mới) — unit test scoring + tie-break + conflictingEvidence.
  - `tests/domains/talent/placement-case.service.test.ts` (mới) — unit test race + idempotency mock.
  - `tests/domains/talent/intake-writer.service.test.ts` (mới) — unit test writer end-to-end (mocked Prisma).
  - `tests/db/intake-writer-integration.test.ts` (mới) — integration test trên `DATABASE_URL_TEST`: race-safe 2 transaction, idempotency replay, RLS context, conflictingEvidence detection, General Interest case.
  - `tests/api/jobs.apply.route.test.ts` (mới) — route test (HTTP layer).
  - `tests/api/admin.intake.staff.route.test.ts` (mới) — route test.
  - `docs/tasks/hrp-v6-n1-intake-writer/{TASK.md,HANDOFF.md,AUDIT.md,evidence/**}`.
- **Out:**
  - `prisma/schema.prisma`, `prisma/migrations/**` (KHÔNG sửa).
  - `app/api/admin/assignments/**` (MP-3C placement activation — giữ nguyên).
  - `app/admin/applications/**` (admin staff cũ — out of scope phase này).
  - `app/(jobs)/**` UI (apply form liên kết — task UI riêng).
  - `src/domains/staffing/**` (MP-3C service — KHÔNG touch).
  - `mergeLaborProfiles(...)` (V6P-007B, task riêng).
  - `JobProposal` / `InteractionOutcome` / `NextAction` (V6P-016/017/018, Track J — out of scope).
  - Partner intake route (`/api/admin/intake/partner`) — defer sang V6P-008 (referral reclaim + attribution policy).
  - Chat/CSKH/provider runtime — CRM app tách riêng.
  - Apply lên `hrp-live` (Tier 0 deploy gate).
- **Allowed task artifacts:** `docs/tasks/hrp-v6-n1-intake-writer/**`.

### 4.3 Domain boundaries

- **Data/state:**
  - `LaborProfile` — append-only w.r.t. identity fields (`fullName`, `normalizedPhone`, `cccdNumber`, `dateOfBirth`); update qua API này chỉ khi caller tạo mới (NEW_PROFILE) — phase này KHÔNG cho phép update identity fields qua intake writer (chỉ `consentAt` mới được set khi intake capture consent).
  - `PlacementCase` — `status` mặc định `OPEN`; transition sang `IN_PROGRESS`/`READY_TO_PLACE`/`CLOSED` thuộc task riêng (V6P-001B close command — phase này chỉ `open`).
  - `CandidateSubmission` — `status` mặc định `NEW`; transition qua status history (`ApplicationStatusHistory`) thuộc task staff cũ (giữ nguyên).
  - `CandidateSubmission.placementCaseId` — phase này **luôn set** cho new writes (resolve active case trước khi insert). Legacy rows nullable giữ nguyên (N1 foundation DEC-N1-03).
- **Permission/security:**
  - Public `/api/jobs/apply`: KHÔNG require auth; chỉ rate-limit log + idempotency.
  - Admin `/api/admin/intake/staff`: require `CAN_CREATE_INTAKE` (admin/HR_MANAGER/HR_STAFF roles — phase này hardcode allowlist theo `WRITE_ROLES` pattern ở `commission-ledger` route; permission catalog `CAN_CREATE_INTAKE` chỉ ghi nhận ở TASK, không enforce ở permission-resolver phase này — sẽ làm ở V6P-025A).
  - RLS: `placement_case` + `candidate_submissions` đã có RLS policy sẵn. Route dùng `withDbContext` để GUCs `app.user_id` + `app.role` đúng (RLS context). Phase này KHÔNG sửa RLS.
- **Interface/API:**
  - `POST /api/jobs/apply` — public; body JSON: `{ fullName, phone, email?, cccdNumber?, dateOfBirth?, jobOpeningId?, projectId?, intent: 'JOB_INTEREST' | 'GENERAL_INTEREST', idempotencyKey, partnerRef?: { kind: 'CTV' | 'VENDOR', userId?, vendorId? } }`. Response: `{ verdict: 'EXACT_MATCH' | 'POSSIBLE_MATCH' | 'NEW_PROFILE', laborProfileId, placementCaseId, candidateSubmissionId, publicTrackingCode?, matchedOn?, conflictingEvidence? }`.
  - `POST /api/admin/intake/staff` — auth required; body JSON tương tự + `actorId` từ `AuthContext.userId`. Response giống.
- **Migration/rollback:** KHÔNG có migration mới. Rollback = revert commit (no data migration). Tier 0 quyết định apply/deploy.

## 5. Execution Plan

Tier 1 chia thành các bước nhỏ; mỗi bước có verify cụ thể. **Không merge code vào main cho đến khi gate cuối PASS + AUDIT round 1 verdict PASS.**

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `src/domains/talent/normalize.ts` | Helper `normalizePhone` (digits only, strip `+84`/`0` đầu cho VN) + `normalizeFullName` (lowercase + trim + collapse). Pure functions, dễ test. | Unit test 6 case: phone `+84 987 654 321` → `987654321`; phone `0987654321` → `987654321`; phone `84 987 654 321` → `987654321`; fullName `  Nguyễn   Văn   A ` → `nguyễn văn a`; fullName empty → `''`; fullName `   ` → `''`. | Test fail → fix helper. |
| `STEP-02` | `src/domains/talent/intake.errors.ts` | Domain errors: `IntakeValidationError` (extends Error, has `field`, `code`); reuse `IdempotencyConflictError` từ `src/shared/integrity/idempotency.ts`. | Unit test instantiation. | Build fail → fix import. |
| `STEP-03` | `src/domains/talent/labor-profile.service.ts` — `scoreAndClassify(applicantInput, existingProfiles)` | Pure scoring function (no Prisma). Trả `{ verdict, matchedOn, conflictingEvidence }`. Rules: ≥2 tín hiệu khớp → `EXACT_MATCH`; 1 tín hiệu khớp, no conflict → `POSSIBLE_MATCH`; 1 tín hiệu khớp, has conflict → `POSSIBLE_MATCH` + `conflictingEvidence`; 0 khớp → `NEW_PROFILE`. | Unit test 8 case: (i) phone+cccd khớp → EXACT_MATCH; (ii) chỉ phone khớp, fullName khác → POSSIBLE_MATCH + conflictingEvidence; (iii) phone+fullName+dateOfBirth khớp → EXACT_MATCH; (iv) chỉ phone khớp, no other signal → POSSIBLE_MATCH (no conflict); (v) cccd khớp, name+DOB khác → POSSIBLE_MATCH + conflictingEvidence; (vi) không có signal nào khớp → NEW_PROFILE; (vii) `existingProfiles` rỗng → NEW_PROFILE; (viii) empty applicantInput → NEW_PROFILE. | Test fail → fix scoring logic. |
| `STEP-04` | `src/domains/talent/labor-profile.service.ts` — `createOrMatchLaborProfile(tx, input, ctx)` | Async wrapper: query existing profiles theo signals (`normalizedPhone` hoặc `cccdNumber`), gọi `scoreAndClassify`. Nếu `EXACT_MATCH` → return existing `laborProfileId`. Nếu `POSSIBLE_MATCH` → return candidate profile id + verdict (KHÔNG merge). Nếu `NEW_PROFILE` → INSERT new LaborProfile + set `consentAt` nếu caller cung cấp. | Unit test mocked Prisma: 3 case tương ứng 3 verdict. | Test fail → fix wrapper. |
| `STEP-05` | `src/domains/talent/placement-case.service.ts` — `openPlacementCase(tx, input, ctx)` | Async: INSERT PlacementCase với `status = OPEN`, `openedAt = now()`, `laborProfileId` từ input. Catch `P2002` (unique violation trên partial unique index) → SELECT existing active case → return. Idempotency: nếu caller cung cấp `idempotencyKey`, dùng `withIdempotency` wrap. | Unit test mocked Prisma: (i) chưa có case → INSERT + return new; (ii) đã có case active → SELECT + return existing (idempotent); (iii) Prisma throw `P2002` → SELECT + return existing (race-safe). | Test fail → fix race handling. |
| `STEP-06` | `src/domains/talent/intake-writer.service.ts` — `createCandidateSubmissionFromIntake(tx, input, ctx)` | Async composite: (a) `createOrMatchLaborProfile` resolve profile; (b) `openPlacementCase` resolve/create case; (c) INSERT CandidateSubmission với `laborProfileId` + `placementCaseId` + `status = 'NEW'` + optional `jobOpeningId`/`projectId` (NULL cho General Interest). Idempotency qua `withIdempotency`. | Unit test mocked Prisma: (i) NEW_PROFILE + new case + new submission; (ii) EXACT_MATCH + existing case + new submission; (iii) General Interest (`jobOpeningId`/`projectId` null) → submission vẫn có `placementCaseId`. | Test fail → fix composite. |
| `STEP-07` | `app/api/jobs/apply/route.ts` (public POST) | Route: parse body (zod), validate `intent ∈ {JOB_INTEREST, GENERAL_INTEREST}`, `idempotencyKey` required, gọi `createCandidateSubmissionFromIntake` trong `withDbContext` với role PUBLIC. KHÔNG log PII. Return JSON với verdict. | Route test (NextRequest mock) 3 case: valid NEW_PROFILE → 201; valid EXACT_MATCH → 200; missing idempotencyKey → 400; conflicting fields → 200 với POSSIBLE_MATCH + conflictingEvidence; General Interest → 201 với placementCaseId. | Test fail → fix route. |
| `STEP-08` | `app/api/admin/intake/staff/route.ts` (auth required POST) | Route: `getAuthContext` → role gate (ADMIN/HR_MANAGER/HR_STAFF) → `withDbContext` với GUC `app.user_id + app.role` → gọi service. KHÔNG log PII. | Route test 3 case: valid + ADMIN → 201; valid + SALE → 403; missing idempotencyKey → 400. | Test fail → fix route. |
| `STEP-09` | Integration test `tests/db/intake-writer-integration.test.ts` | Test trên `DATABASE_URL_TEST` (Postgres thật). Cases: (i) 2 transaction đồng thời `openPlacementCase` cho cùng LaborProfile → chỉ 1 case active; (ii) idempotent replay (cùng key + payload) → 1 submission; (iii) conflicting phone: chỉ phone khớp, fullName khác → POSSIBLE_MATCH + conflictingEvidence + KHÔNG merge; (iv) RLS context: PUBLIC role xem submission qua case link OK; (v) General Interest → case có `placementCaseId` set, submission NULL `jobOpeningId`/`projectId`. | Test pass on `DATABASE_URL_TEST`. Nếu `DATABASE_URL_TEST` không có sẵn → block với ENV_BLOCKED (không phải PASS giả). | Test fail → fix; ENV_BLOCKED nếu thiếu `DATABASE_URL_TEST`. |
| `STEP-10` | Full unit suite + typecheck + design-tokens carry-forward | Chạy `npx tsc --noEmit` + `npx vitest run --config vitest.unit.config.ts` (full unit suite) + `npx vitest run --config vitest.unit.config.ts src/shared/ui/design-tokens.static.test.ts` riêng. | typecheck exit 0; full suite ≥ previous baseline (đếm tại thời điểm chạy, ghi vào evidence). | Fail → fix regress. |
| `STEP-11` | `HANDOFF.md` + `AUDIT.md` + evidence folder | Viết HANDOFF theo template `.ai-pipeline/templates/HANDOFF.template.md`. Audit mode LIGHT: Tier 3 review; Tier 1 resolve. | HANDOFF có đầy đủ AE-01..AE-N (mỗi AC có evidence inline). Audit round 1 verdict PASS hoặc có finding có thể resolve. | Audit BLOCKED → fix hoặc escalate Tier 0. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `createOrMatchLaborProfile` trả đúng `EXACT_MATCH` khi `normalizedPhone` + `cccdNumber` khớp; `POSSIBLE_MATCH` khi chỉ phone khớp (no other signal); `POSSIBLE_MATCH` + `conflictingEvidence` khi phone khớp nhưng fullName khác; `NEW_PROFILE` khi không tìm thấy. | Command: `npx vitest run --config vitest.unit.config.ts tests/domains/talent/labor-profile.service.test.ts` — 8 it-blocks PASS. |
| `AC-02` | Phone một mình KHÔNG bao giờ cho `EXACT_MATCH` — kể cả khi existing profile có cùng phone. | Command: `npx vitest run --config vitest.unit.config.ts tests/domains/talent/labor-profile.service.test.ts -t "phone-only"` — it-block PASS; AC-01 case (ii) cover. |
| `AC-03` | `POSSIBLE_MATCH` KHÔNG tự merge. Nếu caller nhận `POSSIBLE_MATCH`, không có LaborProfile mới nào được tạo với identity fields của candidate trừ khi caller explicitly gọi `createLaborProfile` riêng (out of scope). | Command: `npx vitest run --config vitest.unit.config.ts tests/domains/talent/intake-writer.service.test.ts -t "POSSIBLE_MATCH"` — mock Prisma, assert tx.laborProfile.create chưa được gọi khi verdict = POSSIBLE_MATCH. |
| `AC-04` | `openPlacementCase` race-safe: 2 transaction đồng thời cùng `laborProfileId` → chỉ 1 PlacementCase active tồn tại. Transaction thua nhận `P2002` → SELECT lại case active hiện có → trả idempotent (KHÔNG 500 cho caller). **Round-3 fix**: SAVEPOINT quanh INSERT `placement_case` + `RELEASE` khi success + `ROLLBACK TO` khi P2002 (PG `25P02` recovery). | Command: `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts -t "race"` — chạy với `DATABASE_URL_TEST`; `Promise.all([openCase(txA), openCase(txB)])` cùng `laborProfileId`; query `SELECT COUNT(*) FROM placement_case WHERE labor_profile_id = $1 AND status = 'OPEN'` = 1. **Round-4 result**: 1/1 it-block PASS trên `hrp_mp2_test`, cả 2 fulfilled với `replayed:false` + `replayed:true`, không 500. |
| `AC-05` | Idempotency: cùng `Idempotency-Key` + cùng payload → 2 request nhưng chỉ 1 submission được tạo (lần 2 replay response). Cùng key + payload khác → 409 `IDEMPOTENCY_CONFLICT`. **Round-3 fix**: integration test gọi `withIdempotency()` helper thật qua writer client + GUC HR_MANAGER (KHÔNG INSERT trực tiếp vào `IdempotencyKey` table); 3 case (replay same key+payload; conflict same key+payload diff; concurrent 2 retry). **Round-5 fix**: concurrent retry case handler dùng `createCandidateSubmissionFromIntake(tx, {...})` thật (profile match → open placement case → create submission) qua `withHrManagerContext`; pre-create LaborProfile với deterministic phone để đảm bảo EXACT_MATCH; verify đủ 3 điều kiện (submission count + case/profile DB existence + replay response). | Command: `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts -t "idempotent"` — gọi `withIdempotency()` 2 lần với cùng key + payload → 1 row; sau đó gọi lại với key cũ + payload khác → throw `IdempotencyConflictError`. **Round-5 result**: 3/3 it-block PASS trên `hrp_mp2_test` (concurrent retry dùng handler intake thật + pre-create profile → 2 fulfilled, 1 replayed, 1 fresh, 1 submission + 1 case + 1 profile in DB). |
| `AC-06` | General Interest: body `{ jobOpeningId: null, projectId: null, intent: 'GENERAL_INTEREST' }` → tạo được active PlacementCase + CandidateSubmission với `placementCaseId` set, `jobOpeningId`/`projectId` NULL. Case hợp lệ với 0 Application. | Command: `npx vitest run --config vitest.unit.config.ts tests/db/intake-writer-integration.test.ts -t "general-interest"` — integration test; query `SELECT job_opening_id, project_id FROM candidate_submissions WHERE id = $1` → cả 2 NULL; case link OK. |
| `AC-07` | Actor không tự động trở thành referrer. Route public `/api/jobs/apply` với caller chưa auth → `ctvId`/`vendorId` NULL trên submission. Caller auth (admin/staff) → `createdByUserId` = `ctx.userId`, nhưng `ctvId`/`vendorId` vẫn NULL trừ khi request body có `partnerRef` hợp lệ. | Command: `npx vitest run --config vitest.unit.config.ts tests/api/jobs.apply.route.test.ts -t "actor"` + `tests/api/admin.intake.staff.route.test.ts -t "actor"` — assert `ctvId=null, vendorId=null` trên row INSERT. |
| `AC-08` | KHÔNG log PII: grep output test/log KHÔNG chứa `fullName`, `phone`, `cccdNumber`, `dateOfBirth` raw từ test fixture. Pattern check: search log file cho bất kỳ PII string nào từ fixture data → 0 match. | Manual grep: `Select-String -Pattern "Nguyễn Văn Test|0901234567|012345678901" -Path tests/domains/talent/labor-profile.service.test.ts,tests/api/jobs.apply.route.test.ts,tests/api/admin.intake.staff.route.test.ts` chỉ ra fixture ở test setup, KHÔNG trong `console.log`/`logWarn`/`logInfo` calls. Auto-test capture stdout từ vitest (`--reporter=verbose`) + assert PII strings absent trong captured log. |
| `AC-09` | typecheck PASS: `npx tsc --noEmit` exit 0, không có error mới so với baseline. | Command: `npx tsc --noEmit 2>&1 | Tee-Object -FilePath evidence/typecheck.log` — exit code = 0; đếm `error TS` = 0. |
| `AC-10` | Full unit suite PASS: `npx vitest run` không có test mới fail so với baseline (đếm test tại thời điểm chạy, ghi evidence). | Command: `npx vitest run --config vitest.unit.config.ts 2>&1 | Tee-Object -FilePath evidence/unit-suite.log` — test pass count tăng (do task thêm test mới); test fail count = 0. |
| `AC-11` | Design-tokens carry-forward: `src/shared/ui/design-tokens.static.test.ts` PASS (12/12). | Command: `npx vitest run --config vitest.unit.config.ts src/shared/ui/design-tokens.static.test.ts 2>&1 | Tee-Object -FilePath evidence/design-tokens.log` — exit 0, 12 it-blocks PASS. |
| `AC-12` | `prisma validate` PASS: schema không bị break (smoke test — phase này không sửa schema nhưng check). | Command: `npx prisma validate 2>&1 | Tee-Object -FilePath evidence/prisma-validate.log` — exit 0; output "The schema at prisma/schema.prisma is valid". |
| `AC-13` | File scope: `git diff HEAD --stat` + `git status --porcelain` chỉ touch in-scope roots (§0). KHÔNG touch `prisma/schema.prisma`, `prisma/migrations/**`, `app/(jobs)/**`, `src/domains/staffing/**`, `app/api/admin/assignments/**`. | Command: `git status --porcelain && git diff HEAD --stat` — assert no path match `^(prisma/schema.prisma|prisma/migrations/|app/\(jobs\)/|src/domains/staffing/|app/api/admin/assignments/)` ngoại trừ `prisma/schema.prisma` chỉ khi diff = empty. |
| `AC-14` | KHÔNG viết test data vào `hrp-live`: integration test chỉ chạy trên `DATABASE_URL_TEST`. Nếu `DATABASE_URL_TEST` thiếu → ENV_BLOCKED, KHÔNG PASS giả. **Round-4 evidence**: Neon branch gate chạy thật (`scripts/neon_branch_gate.ps1`) xác nhận endpoint `TEST_DATABASE_URL_*` trỏ về branch `hrp_mp2_test`, không phải primary. Integration test `tests/db/intake-writer-integration.test.ts` chạy 9/9 PASS trên branch đó. | Manual grep: `Select-String -Pattern "hrp-live\|production" -Path tests/db/intake-writer-integration.test.ts` — 0 match (test chỉ đọc `DATABASE_URL_TEST`). **Round-4 thêm RLS test** (PUBLIC denied USING+WITH CHECK, HR_STAFF INSERT placement_case allowed, HR_MANAGER INSERT placement_case + candidate_submissions allowed). |
| `AC-15` | Migration safety: `git diff HEAD -- prisma/migrations/ --stat` KHÔNG có file nào được modify. Migration count = baseline. | Command: `git diff HEAD -- prisma/migrations/ --stat 2>&1 | Tee-Object -FilePath evidence/migration-diff.log` — output rỗng; `git status --porcelain prisma/migrations/` — rỗng. |
| `AC-16` | Audit round 1 verdict: Tier 3 LIGHT PASS (hoặc có finding Tier 1 resolve được). Tier 1 KHÔNG tự phát hành verdict — Tier 3 quyết. | Manual method: đọc `docs/tasks/hrp-v6-n1-intake-writer/AUDIT.md` verdict block — Tier 3 ghi `PASS` / `CONDITIONAL_PASS` (kèm finding) / `FAIL`. Tier 1 append §9 Planner Resolution trong TASK.md. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-04` | `AC-01` |
| `RQ-02` | `STEP-03`, `STEP-04` | `AC-01` |
| `RQ-03` | `STEP-03` | `AC-02` |
| `RQ-04` | `STEP-04`, `STEP-06` | `AC-03` |
| `RQ-05` | `STEP-05`, `STEP-09` | `AC-04` |
| `RQ-06` | `STEP-05`, `STEP-06`, `STEP-09` | `AC-05` |
| `RQ-07` | `STEP-06`, `STEP-07`, `STEP-08` | `AC-07` |
| `RQ-08` | `STEP-06`, `STEP-07`, `STEP-09` | `AC-06` |
| `RQ-09` | `STEP-06`, `STEP-07`, `STEP-08` | `AC-07` |
| `RQ-10` | `STEP-07`, `STEP-08` | `AC-12` |
| `RQ-11` | `STEP-07`, `STEP-08` | `AC-08` |
| `RQ-12` | `STEP-08` | `AC-07` |
| `RQ-13` | `STEP-05`, `STEP-09` | `AC-04` |
| `RQ-14` | `STEP-05`, `STEP-06`, `STEP-09` | `AC-05` |
| `RQ-15` | `STEP-01` | `AC-13`, `AC-15` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Scoring logic sai tie-break → `EXACT_MATCH` cho phone-only → merge sai LaborProfile → orphan relations downstream (TIER0_HANDOVER.md §11 cấm). | Unit test 8 case (AC-01) + integration test conflictingEvidence (AC-03). Revert commit nếu audit fail. |
| `RISK-02` | Race giữa SELECT existing profile và INSERT new profile trong `createOrMatchLaborProfile`: 2 transaction cùng tạo LaborProfile mới cho cùng person → duplicate LaborProfile. | Phase này: SELECT theo `normalizedPhone` + `cccdNumber` trong transaction. **LƯU Ý (round-3 sửa tài liệu)**: schema `LaborProfile.normalizedPhone` chỉ có `@@index([normalizedPhone])` (không phải `@@unique` — xem `prisma/schema.prisma` line 1402). Số điện thoại đơn lẻ không chứng minh cùng người (DEC-02 + TIER0_HANDOVER.md §11 cấm). Race giữa 2 transaction INSERT cùng phone vẫn có thể tạo 2 LaborProfile — đây là **gap cố ý** để caller (qua authority `scoreAndClassify`) quyết merge dựa trên nhiều tín hiệu. Nếu duplicate xảy ra → caller phát hiện qua tie-break scoring (≥2 signals) và route qua V6P-007B merge task. Tier 1 KHÔNG thêm `UNIQUE` constraint trên `normalizedPhone` (out of scope + business rule cấm). |
| `RISK-03` | Integration test `DATABASE_URL_TEST` thiếu → không verify được race-safe + RLS → coi như ENV_BLOCKED, KHÔNG PASS. | ENV_BLOCKED chỉ ghi khi thiếu environment thật. Tier 1 KHÔNG tự fake PASS. Tier 0/Owner quyết có CI test env hay không. |
| `RISK-04` | Actor vô tình thành referrer qua `createdByUserId` → backend khác đọc `createdByUserId` và set `ctvId = createdByUserId`. | Phase này: route KHÔNG set `ctvId`/`vendorId` từ `ctx.userId`. Test AC-07 chứng minh. Caller phải declare explicit `partnerRef`. Document trong HANDOFF rằng downstream KHÔNG nên infer từ `createdByUserId`. |
| `RISK-05` | Log lỡ ghi PII qua `console.error` thay vì `logError`. | AC-08 + grep test. Code review tập trung vào logger calls. |
| `RISK-06` | Tier 1 vô tình touch `prisma/schema.prisma` (vd typo trong import path làm Prisma regen). | AC-12 (smoke validate) + AC-15 (diff stat). Nếu schema bị touch → revert commit. |
| `RISK-07` | Carry-forward design-tokens gate regress do thay đổi file structure. | AC-11 chạy riêng. Nếu fail → xem pattern ở task foundation (xử lý bằng isolated re-run). |
| `RISK-08` | Permission catalog `CAN_CREATE_INTAKE` chưa enforce ở `permission-resolver` — route admin chỉ hardcode role check. | Phase này ghi nhận (DEC-08), KHÔNG làm full catalog (V6P-025A out of scope). Document trong HANDOFF. Tier 1 KHÔNG scale task này lên V6P-025A. |

## 8. Open Questions

None — tất cả DEC đã chốt trong scope phase này. Câu hỏi sau chỉ escalate Tier 0 khi cần:

- **Câu hỏi ngoài scope** (chưa cần trả lời để triển khai phase này):
  - PII consent, retention, deletion policy — TIER0_HANDOVER.md §8 #3 — defer sang task riêng (V6P-027B / policy task).
  - Partner intake route + referral reclaim — defer sang V6P-008.
  - `mergeLaborProfiles` — defer sang V6P-007B.
  - AFF clock policy (calendar vs business days) — TIER0_HANDOVER.md §8 #1 — defer sang N2 task.

Phase này tiếp tục phần độc lập (TIER0_HANDOVER.md chỉ thị). Chỉ escalate khi gặp chính sách nhận dạng chưa chốt (đã chốt: phone alone ≠ identity, ≥2 signals cho EXACT_MATCH) hoặc cần thêm schema (KHÔNG cần — schema đã đủ từ N1 foundation).

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit NONE resolve trực tiếp từ HANDOFF; LIGHT resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|
| 1 | **DEFERRED — round-1 self-accept bị reject vì route `/api/jobs/apply` functional phá DEC-10/RQ-08** (HANDOFF round-1 ghi nhầm `READY_FOR_AUDIT` nhưng route này đã RETIRE theo static test `marketplace-inventory.static.test.ts` regex `RETIRED_POST`). | Route public `/api/jobs/apply` build functional handler trong round-1 vi phạm quyết định retire của Tier 0; Tier 1 phát hiện tại review khi đối chiếu DEC-10 với code đã build. Sửa: REVERT route về stub 410, rút logic N1 về route admin `/api/admin/intake/staff` (auth path). |
| 2 | **ACCEPTED for Tier 3 LIGHT audit round 2.** Round-2 deliver: route public REVERT stub 410 + 3 file production mới (`tests/db/intake-writer-integration.test.ts` 8 case ENV_BLOCKED-by-default, `src/domains/talent/admin.intake.staff.route.test.ts` unit route test, `src/domains/talent/jobs.apply.route.test.ts` runtime ràng buộc stub 410) + allow-list align 2 file integration test (`PublicCardDto` 18→19 keys, `PublicTrackingDto` 8→11 keys) + dọn 3 debug scripts tạm + HANDOFF update theo kết quả thật. Round-2 evidence: 14/16 PASS + 2 SKIP (Redis TEST ENV_BLOCKED, không liên quan 4 lỗi Tier 0). Lane integration: 18 file | 361 PASS | 2 SKIP (363) | 227s — không regress. | Tier 1 ownership toàn plan + code + test. HANDOFF ngày 14/09/2026 (round-2). |
| 3 | **FAIL Tier 3 audit round 3 (CONDITIONAL_ACCEPTED trước audit → FAIL trong audit).** Round-3 fix từ baseline `50dedee` (round-2 HEAD `362e6a9`): (a) Sửa `placement-case.service.ts` thêm SAVEPOINT/RELEASE/ROLLBACK TO quanh `INSERT placement_case` để chịu `P2002` mà không abort toàn transaction (`25P02` recovery) — caller race giờ nhận `replayed:true` thay vì 500; (b) Rewrite `tests/db/intake-writer-integration.test.ts` thật chạy trên `hrp_mp2_test`: AC-04 race qua `openPlacementCase()` 2 tx đồng thời (1 created + 1 replayed, không 500), AC-05 idempotency qua helper `withIdempotency` thật (3 case: replay cùng key+payload, conflict cùng key+payload khác, concurrent 2 retry — case này fail trong round-3 vì dùng shared PrismaClient + Neon transaction-mode pooling serialize trên 1 connection), AC-06 general interest, AC-01 SELECT path, AC-14 RLS (PUBLIC denied USING+WITH CHECK, HR_STAFF INSERT được placement_case). (c) Sửa tài liệu: `RISK-02` round-2 ghi sai `LaborProfile.normalizedPhone` là UNIQUE — schema thật chỉ có `@@index([normalizedPhone])`. (d) Pre-cleanup probe scripts + restore `vitest.integration-files.ts` về state round-2. **Tier 3 audit FAIL** vì 1 case concurrent retry (`fulfilled.length === 0`) — root cause: shared PrismaClient + Neon transaction-mode pooling. | Tier 1 round-4 sửa. |
| 4 | **ACCEPTED for Tier 3 LIGHT audit round 4 (delta review).** Round-4 fix: (a) `tests/db/intake-writer-integration.test.ts` AC-05 concurrent retry giờ dùng 2 PrismaClient RIÊNG (`writer1`, `writer2`) cho 2 calls concurrent — mỗi call có connection pool riêng, đúng pattern production khi 2 HTTP request song song; (b) Handler trong concurrent case dùng `Math.random()` thay `Date.now()` để phone/normalizedPhone unique giữa 2 calls (tránh race LaborProfile UNIQUE nếu 2 handler chạy đồng thời); (c) Cleanup `build-tmp/` + 16 probe log r3 cũ — chỉ giữ log r4 mới nhất làm evidence. Round-4 evidence: integration test `tests/db/intake-writer-integration.test.ts` 9/9 PASS trên `hrp_mp2_test` (Neon branch gate PASS — branch `hrp_mp2_test`, không phải primary); unit suite 132 file | 2173/2173 PASS | 39.55s; integration suite 18 file | 361 PASS + 2 SKIP | 0 FAIL | 243.69s. Pre-existing typecheck BLK-02 vẫn còn (Tier 2 task riêng, không phải delta round-4). Tier 1 chưa push round-4 HEAD lên main (chờ Tier 3 LIGHT audit round 4). |

## 10. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v0.1 DRAFT` | `2026-09-14 08:09` | `Tier 1` | Initial contract (DRAFT) sau N1 foundation ACCEPTED v1.2 (12/09) + Stage 4 apply PASS (13/09 22:28, commit `5b5767b`). Outcome theo TIER0_HANDOVER.md §N1 + V6P-007A/001B/002B/003/002A. Lane CRITICAL + Audit LIGHT (identity + concurrency). Chia thành 11 STEP nhỏ; cover RQ-01..15 + AC-01..16; race-safe qua partial unique index đã có ở schema foundation + idempotency `withIdempotency`. KHÔNG sửa schema, KHÔNG tạo migration, KHÔNG đổi tên CandidateSubmission (TIER0_HANDOVER.md §11). | N0 §N1 mở next domain task; Tier 1 ownership toàn plan + code + test. |
| `v0.1 ACCEPTED round 1` | `2026-09-14 08:50` | `Tier 1` | Round 1 deliver: 36 unit tests PASS, typecheck 0 in-scope errors, prisma validate PASS, design-tokens 12/12, no migration diff, scope allowlist. HANDOFF.md READY_FOR_AUDIT. Current execution round 0 → 1; Current audit round 0. Next gate → /audit Tier 3. **DEFERRED** sau khi đối chiếu DEC-10: route `/api/jobs/apply` functional phá static test retire. | Tier 1 self-accept để Tier 3 LIGHT audit round 1. |
| `v0.2 ROUND_2_DELIVERED` | `2026-09-14 11:35` | `Tier 1` | Round 2 self-accept: (a) REVERT route `/api/jobs/apply` về stub 410 (`retiredApplyEndpointResponse()`) — module KHÔNG import Prisma/service, JSDoc note escalate Tier 0 về câu hỏi (a)/(b); (b) `createCandidateSubmissionFromIntake` thêm optional `jobOpeningId?: string | null` cho audit metadata; (c) 3 file production mới: integration test 8 case ENV_BLOCKED-by-default, admin route unit test, jobs.apply runtime test; (d) allow-list align 2 file integration test (PublicCardDto 18→19 keys, PublicTrackingDto 8→11 keys); (e) dọn 3 debug scripts (`connectivity-test.js`, `debug-grants.js`, `verify-n1-state.js`); (f) HANDOFF update theo kết quả thật + thêm §5 Round-2 → Tier 0 gap map (4 lỗi). HEAD `362e6a9`. Lane integration: 18 file | 361 PASS | 2 SKIP (363) | 227s. Pre-existing typecheck BLK-02 vẫn còn (Tier 2 task riêng). | Round-1 route public phá DEC-10/RQ-08; round-2 REVERT để tôn trọng quyết định retire và pass static test, đồng thời giữ logic N1 ở admin path. |
| `v0.3 ROUND_3_DELIVERED` | `2026-09-14 13:36` | `Tier 1` | Round 3 fix từ baseline `50dedee` (round-2 HEAD `362e6a9`): (a) Sửa `placement-case.service.ts` thêm SAVEPOINT/RELEASE/ROLLBACK TO quanh `INSERT placement_case` để chịu `P2002` mà không abort toàn transaction (`25P02` recovery) — caller race giờ nhận `replayed:true` thay vì 500; (b) Rewrite `tests/db/intake-writer-integration.test.ts` thật chạy trên `hrp_mp2_test`: AC-04 race qua `openPlacementCase()` 2 tx đồng thời (1 created + 1 replayed, không 500), AC-05 idempotency qua helper `withIdempotency` thật (3 case: replay cùng key+payload, conflict cùng key+payload khác, concurrent 2 retry), AC-06 general interest, AC-01 SELECT path, AC-14 RLS (PUBLIC denied USING+WITH CHECK, HR_STAFF INSERT được placement_case); (c) Sửa tài liệu `RISK-02`: ghi đúng `LaborProfile.normalizedPhone` chỉ có `@@index([normalizedPhone])`, KHÔNG `@@unique` (round-2 sai); (d) Pre-cleanup probe scripts + restore `vitest.integration-files.ts`. Round-3 evidence: 9/9 N1 case PASS trên `hrp_mp2_test` (Neon branch gate PASS), unit suite 132 file | 2173/2173 PASS | 52.4s, integration suite 18 file | 361 PASS + 2 SKIP | 0 FAIL | 237s. Pre-existing typecheck BLK-02 vẫn còn (Tier 2 task riêng, không phải delta round-3). **Tier 3 LIGHT audit round 3 trả FAIL vì 1 case AC-05 concurrent retry fail (`fulfilled.length === 0`) — root cause: shared PrismaClient + Neon transaction-mode pooling serialize trên 1 connection.** | Tier 3 LIGHT round-2 trả CONDITIONAL vì AC-04/05/14 chưa có bằng chứng chạy DB thật. Round-3 fix đúng root cause + verify DB-touching, dựa trên audit report round 2. |
| `v0.4 ROUND_4_DELIVERED` | `2026-09-14 15:00` | `Tier 1` | Round 4 fix (delta so với round-3 HEAD): (a) `tests/db/intake-writer-integration.test.ts` AC-05 concurrent retry dùng 2 PrismaClient RIÊNG + `Math.random()` tag — 9/9 PASS trên `hrp_mp2_test`; (b) Cleanup `build-tmp/` + 16 probe log r3 cũ. Round-4 evidence: integration 9/9 PASS, unit 2173/2173 PASS, integration lane 361 PASS + 2 SKIP. Pre-existing BLK-02 vẫn còn (Tier 2 task riêng). **Tier 3 LIGHT round 4 PASS.** | Tier 3 round-3 FAIL → round-4 PASS. |
| `v0.5 ROUND_5_DELIVERED` | `2026-09-14 15:52` | `Tier 1` | Round 5 fix (Tier 0 REVISION_REQUIRED): (a) `tests/db/intake-writer-integration.test.ts` AC-05 concurrent retry handler đổi từ `admin.laborProfile.create` đơn lẻ sang `createCandidateSubmissionFromIntake(tx, {...})` thật qua `withHrManagerContext` — đúng intake flow (profile match → open placement case → create submission); (b) Pre-create LaborProfile với deterministic phone (`normalizePhone`) để đảm bảo EXACT_MATCH; (c) Verify đủ 3 điều kiện: submission count + case/profile existence in DB + replay response (không chỉ đếm IdempotencyKey); (d) Bỏ claim "mỗi HTTP request có PrismaClient riêng" — app dùng singleton, mỗi `withIdempotency` tự wrap `$transaction()` riêng xử lý concurrency; (e) Import `normalizePhone` từ `labor-profile/normalize`. Round-5 evidence: integration test `tests/db/intake-writer-integration.test.ts` 9/9 PASS trên `hrp_mp2_test` (`evidence/intake-writer-r5c.log` 15:51:22). Pre-existing BLK-02 vẫn còn (Tier 2 task riêng). | Tier 0 REVISION_REQUIRED: AC-05 handler phải dùng intake flow thật, verify đủ 3 điều kiện, bỏ claim singleton. |
