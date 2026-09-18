---
id: hrp-v6-n2-aff-05a-handling-assignment
title: AFF-05A Handling Assignment Schema and Service
status: COMPLETED
tier: T1A
author: T1A Integrator
---

# Objective
Implement ReferralAttribution (additive only, no table creation as it exists) and LaborProfileHandlingAssignment schemas in Prisma. Implement Handling Assignment service for initial affiliate assignments and manager manual assignments, hooked into Intake Writer, with strict 7-day expiration logic and at-most-one-active constraint.

# Requirements

## 1. ReferralAttribution
- Map to existing eferral_attributions table.
- Define fields exactly as they exist: id, referrer_user_id, affiliate_code_snapshot, first_clicked_at, expires_at, labor_profile_id, status, consumed_at, created_at, updated_at.
- Add unique constraint to labor_profile_id.

## 2. LaborProfileHandlingAssignment
- Create new model LaborProfileHandlingAssignment mapping to labor_profile_handling_assignments.
- Fields: id, labor_profile_id, assignee_user_id, assigned_by_user_id, source, starts_at, expires_at, status, reason, previous_assignment_id, completed_milestone_id, created_at, updated_at, version.
- Enforce at-most-one-active via partial unique index: CREATE UNIQUE INDEX "labor_profile_handling_active_idx" ON "labor_profile_handling_assignments"("labor_profile_id") WHERE status = 'ACTIVE';

## 3. Service Layer
- Create handling-assignment.service.ts to implement assignments.
- getActiveHandlingAssignment: Fetch active assignment, treat past expiresAt as expired to enforce server-clock expiry without relying on scheduler.
- createInitialAffiliateAssignment: Close previous active assignment and create a new 7-day affiliate assignment.
- managerAssign: Manager can manually override, revoke active, create new active assignment.

## 4. Intake Integration
- Integrate with intake-writer.service.ts: resolve eferralAttributionId, update attribution, and trigger createInitialAffiliateAssignment.

# Verification
- Typecheck, Lint, Build.
- Unit Tests: Verify createInitialAffiliateAssignment, getActiveHandlingAssignment expiration logic, and managerAssign revocation logic.
- Pipeline tests all pass.
