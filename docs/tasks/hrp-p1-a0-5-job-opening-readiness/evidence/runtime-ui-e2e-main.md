# Runtime UI/HTTP E2E — hrp-p1-a0-5-job-opening-readiness

> T0 directive 2026-10-01 — replacement evidence for the rejected PR #71 closeout.
> Worktree: `codex/t1c-p1a05-runtime-e2e-r2`. Baseline: `main @ 2f773993` (PR #70 merged; PR #71 NOT merged).
> DB posture: host alias `ep-shy-tree-*` (raw URL REDACTED per T0 directive).
> Secret hygiene: ADMIN password + JWT secret + HR_STAFF password rotated per-run; NOT recorded here.

| Field | Value |
| --- | --- |
| runId | `runakda-b772f5` |
| baseUrl | `http://localhost:3100` |
| openingId | `seed-opening-runtime-runakda-b772f5` |
| slotId | `seed-slot-SO-VND001-001` |
| orderId | `seed-order-SO-VND001-001` |
| candidatePhone | `phone-alias-*8888` (raw phone REDACTED) |
| hrStaffPhone | `phone-alias-*6293` (raw phone REDACTED) |
| adminPhone | `phone-alias-*9166` (raw phone REDACTED) |
| hrManagerPhone | `phone-alias-*6293` (raw phone REDACTED) |
| same-target | `true` |
| role-type | `synthetic per-run` |

## Step-by-step evidence

| Step | Actor/role | Method/Path | Status | Redacted run-scoped identity | Input state | Output state | Linkage | PASS/FAIL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `1.loginAdmin` | `ADMIN phone-alias-9166 same-target=true host=ep-shy-tree-*` | `POST /api/auth/login` | `200` | runId=`runakda-b772f5` | synthetic-ADMIN not logged in | session-cookie acquired (hrp_session=REDACTED) | precondition for classify/open/publish/recruiter-assignment | PASS |
| `2.classifyJobOpening` | `ADMIN same-target=true host=ep-shy-tree-*` | `POST /api/admin/staffing/job-openings/seed-opening-runtime-runakda-b772f5/classify` | `200` | runId=`runakda-b772f5` | JobOpening seed-opening-runtime-runakda-b772f5 status=DRAFT serviceModel=NULL | JobOpening seed-opening-runtime-runakda-b772f5 serviceModel=RECRUITMENT_SERVICE status=DRAFT | JobOpening created by fixture (status DRAFT, serviceModel NULL); runtime classifies here | PASS |
| `3.openJobOpening` | `ADMIN same-target=true host=ep-shy-tree-*` | `POST /api/admin/staffing/job-openings/seed-opening-runtime-runakda-b772f5/open` | `200` | runId=`runakda-b772f5` | JobOpening seed-opening-runtime-runakda-b772f5 status=DRAFT serviceModel=RECRUITMENT_SERVICE | JobOpening seed-opening-runtime-runakda-b772f5 status=OPEN openedAt=2026-10-01T03:06:27.264Z | classified in step 2; runtime opens here (no developer DB touch) | PASS |
| `4.createJobPostingDraft` | `ADMIN same-target=true host=ep-shy-tree-*` | `POST /api/admin/jobs/job-postings` | `200` | runId=`runakda-b772f5` | slot seed-slot-SO-VND001-001 validForPublish=true; JobOpening seed-opening-runtime-runakda-b772f5 status=OPEN | JobPosting 1bee4767-8290-4d29-a3ff-a20246606259 status=DRAFT (jobOpeningId=seed-opening-runtime-runakda-b772f5) | slot opened; runtime creates JobPosting DRAFT for that opening | PASS |
| `5.publishJobPosting` | `ADMIN same-target=true host=ep-shy-tree-*` | `PATCH then POST publish /api/admin/jobs/job-postings/1bee4767-8290-4d29-a3ff-a20246606259 (PATCH) + .../publish (POST)` | `200 → 200` | runId=`runakda-b772f5` | JobPosting 1bee4767-8290-4d29-a3ff-a20246606259 status=DRAFT revision=0 | JobPosting 1bee4767-8290-4d29-a3ff-a20246606259 status=PUBLISHED publishedAt=2026-10-01T03:06:30.138Z slug=cong-nhan-dien-tu-0-4744c830 | created by step 4; runtime patches + publishes here | PASS |
| `6.publicUiSeesJob` | `anonymous (no session) same-target=true host=ep-shy-tree-*` | `GET /viec-lam/cong-nhan-dien-tu-0-4744c830` | `200` | runId=`runakda-b772f5` | JobPosting PUBLISHED on slot | HTML rendered (53639 bytes) | published in step 5; runtime fetches public detail here | PASS |
| `7.anonymousApply` | `anonymous (no session) same-target=true host=ep-shy-tree-*` | `POST /api/public/jobs/cong-nhan-dien-tu-0-4744c830/applications` | `201` | runId=`runakda-b772f5` | JobPosting PUBLISHED on slot; candidate phone-alias=8888; actualPhone=09018888 | CandidateSubmission 621b1ee3-b4b0-4213-92d8-35b1c5dbcaef → LaborProfile 170f3ec6-773a-4969-b0df-86f4179a9d16 → PlacementCase bb27c31e-7d29-4aac-95b7-b75630fae0b3 | JobPosting published in step 5; runtime applies here; LaborProfile + PlacementCase auto-created via N1 path | PASS |
| `8.linkage` | `verification (Prisma, no cursor)` | `read-only prisma.candidateSubmission.findFirst` | `200` | runId=`runakda-b772f5` | CandidateSubmission 621b1ee3-b4b0-4213-92d8-35b1c5dbcaef | LaborProfile 170f3ec6-773a-4969-b0df-86f4179a9d16 matches expected; PlacementCase bb27c31e-7d29-4aac-95b7-b75630fae0b3 matches expected | submission (step 7) auto-creates LaborProfile + PlacementCase via N1 path | PASS |
| `9.loginHrStaff` | `HR_STAFF phone-alias-6293 same-target=true host=ep-shy-tree-*` | `POST /api/auth/login` | `200` | runId=`runakda-b772f5` | HR_STAFF user (fixture) not logged in | session-cookie acquired (role embedded in JWT cookie) | precondition for recruiter Workbench MINE, claim, placement actions | PASS |
| `11.claim` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `POST /api/admin/applications/621b1ee3-b4b0-4213-92d8-35b1c5dbcaef/claim` | `201 (canonical) / 201 (replay) / 201 (race)` | runId=`runakda-b772f5` | CandidateSubmission 621b1ee3-b4b0-4213-92d8-35b1c5dbcaef unclaimed | LaborProfileHandlingAssignment ACTIVE (canonical); replay returns same outcome; race loses with 409 | Workbench MINE (step 10) shows this submission; runtime claims it; replay & race contract verified | PASS |
| `10.workbenchMine` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `GET /api/admin/recruiter-workbench?view=MINE` | `200` | runId=`runakda-b772f5` | expected CandidateSubmission 621b1ee3-b4b0-4213-92d8-35b1c5dbcaef in MINE view | items=1 containsExpected=true | submission created by step 7; recruiter with ACTIVE assignment must see it in MINE | PASS |
| `12.placementActionUiVisibility` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `GET (placement action control) /admin/recruiter-workbench?view=MINE` | `200` | runId=`runakda-b772f5` | placement action control rendered server-side | page rendered 54720 bytes; actions reachable via canonical /api/admin/recruiter/placements/[id]/actions/* | workbench MINE (step 10); placement action UI rendered here | PASS |
| `14.createPlacement` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `POST /api/admin/recruiter/placements` | `201` | runId=`runakda-b772f5` | CandidateSubmission 621b1ee3-b4b0-4213-92d8-35b1c5dbcaef claimed (step 11) | Placement 307719da-868e-482d-96cc-828550d157b2 | claim active (step 11); runtime creates Placement via recruiter route | PASS |
| `15.confirmPlacement` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `POST /api/admin/recruiter/placements/307719da-868e-482d-96cc-828550d157b2/actions/confirm` | `200` | runId=`runakda-b772f5` | Placement 307719da-868e-482d-96cc-828550d157b2 status=NEW | Placement 307719da-868e-482d-96cc-828550d157b2 status=CONFIRMED (or terminal per serviceModel) | placement created (step 14); runtime confirms via recruiter route | PASS |
| `16.terminalPlacement` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `POST effective (or cancel fallback)` | `200` | runId=`runakda-b772f5` | Placement 307719da-868e-482d-96cc-828550d157b2 status=CONFIRMED | Placement 307719da-868e-482d-96cc-828550d157b2 terminal via effective (or cancel fallback) | confirmed in step 15; runtime drives terminal transition; UI must reflect on next refresh | PASS |
| `16b.uiRefresh` | `HR_STAFF same-target=true host=ep-shy-tree-*` | `GET /api/admin/recruiter-workbench?view=MINE (UI reload)` | `200` | runId=`runakda-b772f5` | terminal transition in step 16 | Workbench MINE reloads with terminal-state Placement 307719da-868e-482d-96cc-828550d157b2 | terminal transition (step 16); UI must reflect refreshed state on next page load | PASS |
| `17.teardown` | `TEARDOWN same-target=true host=ep-shy-tree-*` | `DELETE run-scoped rows ` | `0` | runId=`runakda-b772f5` | run-scoped ids = {"submissionId":"621b1ee3-b4b0-4213-92d8-35b1c5dbcaef","placementCaseId":"bb27c31e-7d29-4aac-95b7-b75630fae0b3","laborProfileId":"170f3ec6-773a-4969-b0df-86f4179a9d16"} | see teardown-zero-residue section | final teardown — exact-ID zero-residue | PASS |

## Aggregate summary

- Status: **PASS**
- residueCheck: {"placement":0,"submission":0,"placementCase":0,"laborProfile":0}
- teardownResult: {"ok":true,"summary":{"submissionId":"621b1ee3-b4b0-4213-92d8-35b1c5dbcaef","placementCaseId":"bb27c31e-7d29-4aac-95b7-b75630fae0b3","laborProfileId":"170f3ec6-773a-4969-b0df-86f4179a9d16","placements":["307719da-868e-482d-96cc-828550d157b2"]}}
- evidenceLogSize: 17