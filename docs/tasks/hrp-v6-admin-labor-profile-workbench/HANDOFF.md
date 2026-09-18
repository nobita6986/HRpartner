# HANDOFF — `hrp-v6-admin-labor-profile-workbench`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-admin-labor-profile-workbench` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Execution round | `4` |
| Baseline | `e798af80fd4111b5c41688abc1b9b9362b3b7727` |
| Status | `ACCEPTED` |

## 1. Outcome and changed surface

- **Delivered:** W4 Admin LaborProfile Workbench Remediation (Round 3). 
  - Fixed TASK.md control fields and removed unauthorized N2 filters from AC-06.
  - Strict enforcement of `CAN_VIEW_WORKER_SENSITIVE` for unmasking (removed Admin bypass).
  - Fixed TERMINATED filter precedence so that profiles with an ACTIVE episode are correctly excluded.
  - Required `consent` explicitly in schema.
  - Persisted `LaborProfileIntake` properly with channel mapping.
  - Rebuilt the intake form into a true 3-step form with an exact-match deduplication preview.
- **Not delivered:** None. All remediation ACs and round 3 audit requests met.
- **Changed:** 
  - `docs/tasks/hrp-v6-admin-labor-profile-workbench/TASK.md` (Round bump + Fix AC-06)
  - `src/domains/talent/labor-profile.read-service.ts` (Permission bypass fix, Filter fixes, exactPhone)
  - `src/domains/talent/labor-profile.read-service.test.ts` (Tests updated for permissions and filters)
  - `app/api/admin/labor-profiles/route.ts` (Intake creation, exactPhone exposure, consent schema)
  - `app/admin/labor-profiles/page.tsx` (Removed unauthorized filter chips)
  - `app/admin/labor-profiles/new/page.tsx` (Full 3-step UI, exact match safe dedup preview)
- **Lane escalation:** No

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath ...` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `Tests 2290 passed (2290)` | `None` |
| `AC-02` | `E-02` | `Compiled successfully in ~25s` | `None` |
| `AC-03` | `E-01` | `Tests 2290 passed (2290)` | `None` |
| `AC-04` | `E-02` | `Compiled successfully in ~25s` | `None` |
| `AC-05` | `E-01` | `Tests 2290 passed (2290)` | `None` |
| `AC-06` | `E-02` | `Compiled successfully in ~25s` | `None` |
| `AC-07` | `E-01` | `Tests 2290 passed (2290)` | `None` |
| `AC-08` | `E-02` | `Compiled successfully in ~25s` | `None` |
| `AC-09` | `E-02` | `Compiled successfully in ~25s` | `None` |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npm run test:unit` | `0` | `docs/tasks/hrp-v6-admin-labor-profile-workbench/evidence/test-unit.txt` |
| `E-02` | `npm run build` | `0` | `inline` |
| `E-03` | `verify-task.ps1` | `PASS` | `inline` |
| `E-04` | `verify-handoff.ps1` | `PASS` | `inline` |
| `E-05` | `npm run lint` | `0` | `inline` |
| `E-06` | `npm run typecheck` | `0` | `inline` |

Evidence files are logged to `docs/tasks/hrp-v6-admin-labor-profile-workbench/evidence/`.

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `D-01` | `SCOPE` | The Admin Workbench cannot convert a worker yet (disabled per N2 boundary constraints). | No |
| `D-02` | `SCOPE` | Deduplication only uses precise exactPhone matching if `POSSIBLE_MATCH` is hit on backend. UI manual prompt gracefully degrades. | No |

## 5. Final status

- **PII Oracle Closed**: `cccdNumber` is now conditionally included in generic search *only* when `canSeeSensitive` is active (`labor-profile.read-service.ts`).
- **Canonical Intake API**: Re-routed `POST /api/admin/labor-profiles` to consume `createCandidateSubmissionFromIntake`, ensuring `ADMIN_INTAKE` is properly documented inside the submission schema.
- **Deduplication UI**: Properly handles 409 `POSSIBLE_MATCH`. The `forceNew` flag has been fully removed from both API, form, and tests.

Handoff status: READY_FOR_AUDIT
