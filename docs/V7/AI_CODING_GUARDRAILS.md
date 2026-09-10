# HRP — AI CODING GUARDRAILS

**Status:** Mandatory engineering rules  
**Applies to:** V6+, V7, all AI coding agents and implementation tasks

---

# 1. PURPOSE

These rules prevent implementation drift, oversized files, hardcoded business logic, and future forced refactors.

Every coding task MUST satisfy these guardrails unless an Architecture Decision explicitly overrides them.

---

# 2. FILE SIZE / MODULE BOUNDARY RULES

## 2.1 Soft limits

Recommended maximums:

```text
React page/component file:        <= 300 lines
Domain service / command file:    <= 350 lines
Repository/query service file:    <= 350 lines
Route handler file:               <= 200 lines
Schema adapter / mapper file:     <= 250 lines
Test file:                        <= 500 lines
```

These are soft limits, not reasons for meaningless fragmentation.

If a file exceeds the soft limit, the coding agent MUST review whether multiple responsibilities are being mixed.

## 2.2 Hard warning threshold

Any production source file exceeding:

```text
500 lines
```

requires an explicit implementation note explaining why it should remain one module.

Files exceeding:

```text
700 lines
```

should be treated as an architecture smell and split unless there is a strong technical reason not to.

Generated files, migrations, lock files, and schemas maintained by tooling are exempt.

---

# 3. ONE RESPONSIBILITY PER MODULE

Do not create files that simultaneously own:

```text
UI rendering
domain validation
database queries
permission checks
business transitions
external integration
```

Preferred separation:

```text
UI
→ application command/query
→ domain policy/service
→ repository
→ persistence/integration adapter
```

A route handler should orchestrate request validation/auth and call an application command/query. It should not contain the domain algorithm.

---

# 4. NO BUSINESS HARDCODE

Business values likely to change MUST NOT be scattered through code.

Examples:

```text
7-day handling duration
availability freshness thresholds
SLA thresholds
allowed transition maps
ServiceModel behavior
role-to-permission mapping
close/failure reason catalogs
contact/consent policy
matching thresholds
```

Use centralized:

```text
policy module
configuration
catalog
decision table
domain enum/value object
```

as appropriate.

Example:

BAD:

```ts
if (days > 7) ...
```

repeated in multiple files.

GOOD:

```ts
handlingPolicy.getInitialProtectionWindow(...)
```

---

# 5. ENUM / CATALOG RULE

Canonical vocabularies must have one authoritative definition.

Do not independently redefine strings such as:

```text
AVAILABLE_NOW
WORKING_VIA_HRP
AFF_INITIAL
STAFFING_SUPPLY
PLACEMENT_EFFECTIVE
```

in UI, API and DB layers.

Use shared typed catalogs/value objects.

UI labels may map from the canonical catalog, but labels are not canonical state.

---

# 6. STATE TRANSITION RULE

Critical lifecycle changes MUST use named commands.

Do not use generic updates for:

```text
PlacementCase stage/status
HandlingAssignment
ReferralAttribution
Placement lifecycle
EmploymentEpisode
ProjectAssignment
BeneficiaryDecision
identity merge
```

Examples:

```text
openPlacementCase()
transferHandling()
markPlacementEffective()
startAssignment()
mergeLaborProfiles()
```

Transition rules live in domain/application services, not React components.

---

# 7. QUERY / PROJECTION RULE

Do not repeat complex business-state queries across screens.

Examples requiring canonical query/projection services:

```text
current handler
Company Pool
current relationship
effective availability
JobOpening fulfillment
active PRIMARY Assignment
active PlacementCase
overdue NextAction
```

A UI component must not reconstruct domain truth with its own joins/filters.

---

# 8. CONFIGURATION RULE

Configuration must be used only for values that are truly configurable.

Do not move every constant into environment variables.

Use:

```text
domain constants
policy config
deployment config
feature flags
```

for distinct purposes.

Environment variables are for deployment/runtime configuration, not business vocabulary.

---

# 9. FEATURE FLAG RULE

Feature flags may support rollout of:

```text
new read model
new Workbench
new Placement flow
new integration
```

Feature flags MUST NOT maintain two competing canonical business semantics indefinitely.

After stabilization, legacy flags and dead paths must be removed through explicit cleanup tasks.

---

# 10. SHARED UTILITIES RULE

Do not create generic `utils.ts` dumping grounds.

Prefer explicit modules:

```text
phone-normalization.ts
availability-policy.ts
placement-transition.ts
handling-expiry.ts
permission-scope.ts
```

If a utility becomes domain-aware, move it into the appropriate domain module.

---

# 11. DTO / MAPPER RULE

Do not pass raw Prisma entities directly to every UI/API surface.

Use explicit:

```text
command inputs
query/read DTOs
public projection DTOs
partner/client projection DTOs
```

This prevents schema changes from forcing widespread UI refactors and reduces accidental PII leakage.

---

# 12. REPOSITORY RULE

Database access for domain aggregates should be centralized through repositories/query services where practical.

Do not scatter raw Prisma queries for the same business concept across many route/component files.

Critical invariants still need DB constraints where feasible; repository abstraction does not replace database integrity.

---

# 13. TESTABILITY RULE

Business policy must be callable without rendering UI.

Every critical command should be testable with:

```text
input
actor/context
canonical state
expected effects
```

Avoid business logic embedded in hooks/components that require browser rendering to test.

---

# 14. DEPENDENCY DIRECTION

Preferred:

```text
UI
↓
Application
↓
Domain
↓
Repository interfaces
↓
Infrastructure
```

Domain code should not import:

```text
React
Next.js page components
Chatwoot
Zalo SDK
HTTP request objects
```

Integration adapters translate external data into HRP commands/contracts.

---

# 15. INTEGRATION ADAPTER RULE

Each external provider gets a bounded adapter.

Examples:

```text
zalo-oa-adapter
chatwoot-adapter
python-commission-adapter
```

Do not spread provider-specific fields across core domain models.

Core uses canonical provider-neutral contracts.

---

# 16. MIGRATION RULE

Migrations must not become application logic.

Backfill scripts should be:

```text
idempotent where feasible
dry-run capable
counted/reported
fail-closed
explicit about unresolved records
```

Do not leave temporary migration heuristics in permanent domain services.

---

# 17. NAMING RULE

Names must reflect business semantics.

Avoid vague modules:

```text
helpers
common
manager
processor
service2
misc
handler-utils
```

Prefer:

```text
placement-case-command-service
talent-repository-query
handling-policy
placement-effectiveness-policy
```

---

# 18. REVIEW CHECKLIST FOR EVERY AI CODING TASK

Before completing a task, the agent must verify:

```text
[ ] Did I create/modify a file >500 lines?
[ ] Did I mix multiple responsibilities?
[ ] Did I duplicate business constants?
[ ] Did I hardcode policy thresholds?
[ ] Did I put domain logic in UI/route code?
[ ] Did I bypass a canonical command/query?
[ ] Did I introduce raw Prisma reads for an existing projection?
[ ] Did I weaken permission/RLS boundaries?
[ ] Did I create a generic status/owner shortcut?
[ ] Did I preserve audit/effective-time/idempotency rules?
[ ] Are tests focused on business behavior?
[ ] Is a future policy change localized to one module?
```

If any answer indicates debt, fix it before marking the task DONE or explicitly record a debt item approved by architecture review.

---

# 19. DEFINITION OF DONE — MAINTAINABILITY

A task is not DONE merely because tests pass.

It must also satisfy:

```text
small coherent modules
single source of business vocabulary
localized policy changes
canonical command/query usage
typed contracts
no avoidable duplicated logic
no hidden hardcoded rules
```

---

# 20. ARCHITECTURAL PRINCIPLE

The goal is not to maximize the number of files.

The goal is:

> each business rule has one obvious home, each module has a coherent responsibility, and changing a policy should not require searching and editing unrelated parts of the codebase.
