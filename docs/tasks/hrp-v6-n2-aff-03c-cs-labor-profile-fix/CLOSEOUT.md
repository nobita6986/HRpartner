# AFF-03C Closeout - Production Accepted

## Decision

**AFF-03C is ACCEPTED for production.** The decision is based on the merged PR, green post-merge CI, production deployment, read-only production verification, and the production public-intake smoke recorded below.

## Scope

- PR: [#23](https://github.com/nobita6986/HRpartner/pull/23)
- Feature commit: e6eec8d17051ad42c4b71f59dcb8ba096a0304be
- Squash merge commit on main: 8a4a3f388eaa1209e207eb6491f1127622f81701
- Baseline: 1e9170512d147cfee8d6c5dcfcabf202bcdb4224 (AFF-03B)
- Changed surface: the AFF-03C migration, its static security-boundary guard, and the public-intake integration regression test.
- Migration: 20260921140000_aff03c_cs_labor_profile_backfill

## Audit

Retrospective Tier 3 LIGHT audit at closeout of 1e917051..8a4a3f38 found no release-blocking issue (PR #23 had already merged). The audit confirmed:

- The RPC INSERT writes both labor_profile_id and placement_case_id.
- Backfill is limited to rows with a placement case and a NULL direct labor-profile link.
- SECURITY DEFINER, owner, pinned search_path, and EXECUTE grants remain constrained.
- SET/INHERIT cleanup is fail-closed.
- No role creation/alteration, schema expansion, or API surface was added.

The initial evidence gap about writable-staging proof was closed after the Owner handover attested the hrp_mp2_test branch gate, AFF-03C staging apply, and targeted 15/15 staging tests. Tier 3 did not independently re-run staging.

## CI and deployment

- PR checks: Integration PASS, Quality PASS, Vercel PASS, Vercel Preview Comments PASS.
- Post-merge main CI run: 35574914319 SUCCESS.
- Vercel production deployment: reported complete by Owner handover.

## Production verification

Read-only verification against the production endpoint completed with exit 0:

- orphan_count=0.
- Existing HRP Production Smoke Check fixture: old_smoke_count=1, old_smoke_linked_count=1.
- Function owner: hrp_public_rpc.
- SECURITY DEFINER=true.
- Pinned search_path present.
- app_user_writer has EXECUTE.
- hrp_public_rpc has no CREATE on schema public.
- 43 migrations applied, 0 failed; AFF-03C migration applied.
- Remaining managed Neon membership is neondb_owner granted by cloud_admin with set_option=false and inherit_option=false.

## Production smoke evidence

Synthetic production smoke ran against https://www.hrpartner.vn/api/public/intake and was not cleaned up:

- No-cookie marker HRP-AFF03C-SMOKE-NOCOOKIE-20260921081639: HTTP 201; CandidateSubmission b87afb06-6f26-4f48-979d-50094e367478; LaborProfile 697e29d6-b37d-4dc5-9f61-729cad0a585c; PlacementCase 53daed3d-5023-4b4b-8d3b-6892c7b29dd8.
- Forged-cookie marker HRP-AFF03C-SMOKE-FORGED-20260921081639: HTTP 201; CandidateSubmission ee873e60-3156-4d30-8340-059c24ce008a; LaborProfile ea013d6c-1c68-4c52-8063-4cd3a1dc5be0; PlacementCase 6da1263e-c252-4c46-80ef-210ca4884ebe.
- Both rows have non-NULL direct links, each direct link equals the canonical PlacementCase LaborProfile link, and each has aff_assignment_count=0.
- Owner authorization is required before deleting these production fixtures.

## Next coordination boundary

AFF-03C is closed. T1A may now rebase codex/t1a-realignment-discovery-docs onto the new main, preserve this closeout cursor, and open its documentation/contract PR. A separate new T1B worktree may later be created from the latest main for the W5/HandlingAssignment defects; no runtime or migration work belongs in the T1A documentation PR.
