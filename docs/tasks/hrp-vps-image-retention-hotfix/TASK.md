# TASK — VPS HRP image retention

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-vps-image-retention-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `INFRA` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | Production deploy cleanup can affect rollback availability and disk capacity. |
| Spec version | `v1.2` |
| Status | `READY_FOR_REVIEW` |
| Planner | `Tier 1` |
| Baseline | `b8cd2b0a10840a0b9eb37c36638f4a23f0e0062f` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `.github/workflows/ci.yml`; `.github/workflows/deploy-vps.yml`; `deploy/vps-production/prune-old-hrp-images.sh`; `deploy/vps-production/tests/prune-old-hrp-images.test.sh`; `deploy/vps-production/README.md`; this task folder |
| Forbidden paths | VPS runtime/data, secrets, app code, Docker volumes, unrelated images |
| Required gates | `bash -n deploy/vps-production/prune-old-hrp-images.sh`; `bash -n deploy/vps-production/tests/prune-old-hrp-images.test.sh`; `bash deploy/vps-production/tests/prune-old-hrp-images.test.sh`; CI Quality, Integration, Build, and Vercel checks; VPS deployment run; `git diff --check`; `node .ai-pipeline/scripts/verify-encoding.mjs` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | Commit/push combined changes, open PR, wait for required CI, merge, then verify automatic VPS deployment |

## 1. Outcome

### 1.1 User-visible outcome

- Successful CI-driven VPS deployments retain the new HRP image and a temporary tag for the image running immediately before deployment, then remove older HRP tags so repeated releases do not fill the VPS disk.

### 1.2 Non-goals

- Do not prune runtime data or volumes, or alter Redis, database, application behavior, image build/publish, or deployment smoke checks.
- Cleanup is best-effort and runs after the existing deploy script succeeds; it uses the existing deploy user's Docker access and does not change sudoers.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `.github/workflows/deploy-vps.yml` invokes the root-owned `/opt/hrp/deploy-production.sh` but does not transfer its source from the checked-out commit. | Editing the source deploy script alone would not update the production script. |
| `EV-02` | Existing cleanup is dangling-only; tagged HRP releases accumulate. | The production deploy path needs an explicit HRP-scoped cleanup step. |
| `EV-03` | Read-only VPS inspection found 38 images / 43.87 GB, 3 running containers, and 0 GB free; the HRP app had many unreferenced SHA-tagged releases. | Confirms the retention gap caused real production disk exhaustion. |
| `EV-04` | The workflow can inspect `hrp-app` as the existing deploy user before deployment and capture its immutable image ID. | Provides the exact rollback image ID without reading the root-only release file. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Before deployment, add a temporary HRP tag to the image ID captured from the running `hrp-app`; preserve that rollback tag and the new release tag, then remove other HRP tags. | `CHOSEN` |
| `DEC-02` | Run cleanup after the deploy script (including both smoke checks) succeeds; cleanup failures must not roll back a healthy release. | `CHOSEN` |
| `DEC-03` | The added helper only removes old HRP repository tags and does not add global image pruning; existing deploy behavior is otherwise unchanged. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| N/A | N/A | `N/A` | N/A | N/A | N/A | This changes an existing shell deployment script and adds no general-purpose capability or dependency. |

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| N/A | N/A | `N/A` | N/A | N/A | N/A | N/A | The existing VPS release workflow sends a small cleanup helper after successful deployment; no scheduler or dependency is added. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Tag the pre-deploy running image before deployment so legacy dangling-image pruning cannot remove it; after smoke success, retain that rollback tag and the new release tag while removing older HRP tags. |
| `RQ-02` | Keep cleanup best-effort and preserve existing rollback behavior; failed cleanup cannot invalidate a successful deploy. |
| `RQ-03` | The added cleanup must not remove containers, volumes, Redis/Postgres/bridge images, or images belonging to other repositories, and must not invoke a global prune. |
| `RQ-04` | Deliver the helper from the checked-out release commit over the existing pinned SSH connection; do not replace privileged server scripts or alter sudoers. |

### 4.2 Scope boundaries

- **In:** HRP-scoped cleanup helper, regression test, wiring into the VPS release workflow, and operator documentation.
- **Out:** secrets, runtime data, app behavior, other repositories/images, sudoers, existing deployment smoke checks.
- **Allowed task artifacts:** `docs/tasks/hrp-vps-image-retention-hotfix/**`.

### 4.3 Domain boundaries

- **Data/state:** N/A — no application or persistent service data changes.
- **Permission/security:** N/A — no authorization or credential changes.
- **Interface/API:** N/A — no public interface changes.
- **Migration/rollback:** Preserve current and previous immutable HRP image references; cleanup only follows successful deployment.

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `.github/workflows/deploy-vps.yml`; `deploy/vps-production/prune-old-hrp-images.sh` | Capture and temporarily tag the pre-deploy image ID, then deliver and run HRP-only cleanup after deployment succeeds. | `AC-01..AC-04`; shell syntax check | Stop if the prior image ID cannot be safely identified or pinned. |
| `STEP-02` | `deploy/vps-production/tests/prune-old-hrp-images.test.sh` | Add assert-based regression coverage for image scope, retention, and workflow wiring without a Docker daemon. | `AC-05..AC-07` | Stop if test requires a real Docker daemon. |
| `STEP-03` | `deploy/vps-production/README.md` and changed surface | Document retention behavior; review diff and run gates. | `AC-08` | Stop if cleanup can target non-HRP images or persistent state. |
| `STEP-04` | PR and production deployment | Commit/push, wait for PR CI, merge, and verify the automatic VPS deployment run. | `AC-09` | Stop if CI or the deploy workflow fails. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Cleanup targets only the HRP repository. | `bash deploy/vps-production/tests/prune-old-hrp-images.test.sh`; manual review of the repository filter. |
| `AC-02` | The new release tag and temporary pre-deploy rollback tag remain protected; the old image stays pinned through the legacy deploy script's dangling prune. | `bash deploy/vps-production/tests/prune-old-hrp-images.test.sh`; manual review of workflow order and ID/tag checks. |
| `AC-03` | Cleanup runs only after the existing deployment command succeeds. | `bash deploy/vps-production/tests/prune-old-hrp-images.test.sh`; manual review of workflow order. |
| `AC-04` | Cleanup failure cannot impact app availability or rollback behavior. | Manual review of the helper's warning-only error handling and workflow order. |
| `AC-05` | Old HRP tags are removed, current and previous remain, and the helper does not call global prune. | Command: `bash deploy/vps-production/tests/prune-old-hrp-images.test.sh`; manual review of its mock assertions. |
| `AC-06` | Cleanup helper and test parse successfully. | Manual commands: `bash -n deploy/vps-production/prune-old-hrp-images.sh` and `bash -n deploy/vps-production/tests/prune-old-hrp-images.test.sh`. |
| `AC-07` | Workflow transmits the helper from the checked-out release after deploy. | Regression test and manual review of workflow order. |
| `AC-08` | Changed text files pass encoding and whitespace gates. | `node .ai-pipeline/scripts/verify-encoding.mjs`; `git diff --check HEAD` |
| `AC-09` | PR CI is green, the change is merged, and automatic VPS deployment succeeds. | Manual review of GitHub required checks and the deployment workflow result. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01`, `STEP-02` | `AC-01`, `AC-02`, `AC-05` |
| `RQ-02` | `STEP-01` | `AC-03`, `AC-04` |
| `RQ-03` | `STEP-01`, `STEP-02` | `AC-01`, `AC-05` |
| `RQ-04` | `STEP-01` | `AC-07` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Removing the wrong image could reduce rollback options. | Match image IDs, preserve active + previous immutable image, limit targets to the HRP repository, and run cleanup after successful smoke checks only. |

## 8. Open Questions

- None.

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-12` | Initial contract | Prevent repeat VPS disk exhaustion while retaining one rollback image. |
| `v1.1` | `2026-10-12` | Use the checked-out release workflow to deliver scoped cleanup; exclude global prune and include the authorized merge/deploy path. | The root-owned VPS script is not copied from the repository by the current workflow. |
| `v1.2` | `2026-10-12` | Pin the pre-deploy image with a temporary tag before the legacy deploy script's dangling prune. | Ensure rollback image survives through the existing deploy script. |
