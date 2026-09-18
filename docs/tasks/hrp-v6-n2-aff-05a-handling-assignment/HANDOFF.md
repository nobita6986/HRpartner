---
id: hrp-v6-n2-aff-05a-handling-assignment
title: AFF-05A Handling Assignment Delivery
status: HANDOFF
tier: T1A
---

# Scope Accomplished
- **Prisma Schema Additions**: Added ReferralAttribution and LaborProfileHandlingAssignment to prisma/schema.prisma.
- **Additive Migration**: Created manual additive migration 20260918000000_aff05a_labor_profile_handling_assignment for labor_profile_handling_assignments and necessary constraints, ensuring eferral_attributions table is not recreated.
- **Service Layer Implementation**: Implemented src/domains/talent/handling-assignment.service.ts providing assignment creation, manual assignment overrides, and active assignment resolution with server-side time-based expiration checking.
- **Intake Integration**: Updated src/domains/talent/intake-writer.service.ts to link resolved eferralAttributionId, consume the attribution, and trigger the initial 7-day affiliate handling assignment.

# Evidence
- **Typecheck & Lint**: Ran 
pm run typecheck and 
pm run lint, resolving any TypeScript errors (replaced date-fns with native JS Date logic to satisfy missing types).
- **Unit Tests**:
  - handling-assignment.service.test.ts: Passes all tests simulating affiliate assignment creation, manual manager overrides, and time-based strict expiration logic without scheduler dependency.
  - Test suite passes successfully (itest run).
- **Build**: Built successfully via 
pm run build.

# Known Constraints & Limitations
- The intake-writer.service.ts changes assume that eferralAttributionId is correctly resolved by the caller. This depends on subsequent integration with the referral attribution lookup logic in the intake routes.

# Next Steps
- T3 should audit this work for correctness against N2 requirements.
- The ReferralAttribution status consumption lifecycle can now be extended using this foundation.
