# AUDIT — `hrp-f9b-r2-slot-scope-read-restore` (F9-B correction round 2)

**Pipeline V2 — Tier 3 LIGHT DELTA audit. Pending Tier 3 adoption.**

## 0. Control

| Field | Value |
| --- | --- |
| Task slug | `hrp-f9b-r2-slot-scope-read-restore` |
| Audit-target HEAD | `c3fa409a` (R2 forward-only commit on top of R1 final semantic SHA `e68ea4a3`) |
| Predecessor audit-target | F9-B R1 final semantic `e68ea4a3`; F9-B R1 docs/evidence freeze `a4dfcded`; F9-B R1 Tier-3 LIGHT audit adoption `d777cf71`; F9 X4 `0d38042f`; F9 X5 `1b9bbd9f` |
| Audit mode | `LIGHT` (DELTA only — R2 surface against R1 final semantic SHA) |
| Audit reason | R2 is a CRITICAL / LIGHT DELTA on a forward-only corrective migration that restores the canonical read blast radius on `staffing_order_slots` while preserving every byte of the R1 least-privilege write hardening. The full R1 chain (X4 → X5 → R1 implementation → R1 docs/evidence freeze → R1 Tier-3 adoption) was already Tier-3-audited and adopted at SHA `d777cf71`. R2 does not undo any of that. |
| Audit baseline | `e68ea4a3e4521eeb794e7c051a7bea0c33ec70f5` (F9-B R1 final semantic SHA) |
| Predecessor AUDIT | `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/AUDIT.md` (R1, Tier-3 LIGHT PASS at SHA `d777cf71`) |
| Predecessor HANDOFF | `docs/tasks/hrp-f9b-jobposting-write-boundary-hardening/HANDOFF.md` (R1) |
| This HANDOFF | `docs/tasks/hrp-f9b-r2-slot-scope-read-restore/HANDOFF.md` (R2, author pending Tier-3 adoption) |
| Status | `PENDING_TIER3_DELTA` |

## 1. DELTA Scope (Tier 3 to verify)

The Tier 3 LIGHT DELTA audit must verify the following properties on the exact committed audit-target HEAD `c3fa409a`:

### 1.1 Migration is forward-only and idempotent

- [ ] `prisma/migrations/20261004000000_f9b_r2_slot_scope_read_restore/migration.sql` exists.
- [ ] The migration DROPs `hrp_f9b_slots_manager_select` (over-restrictive R1 read).
- [ ] The migration CREATEs `hrp_f9b_slots_project_select` with `FOR SELECT`, `TO app_user_writer, app_user`, `USING (hrp_project_visible_for(so.project_id) = true)`.
- [ ] The migration runs an in-migration static guard (PL/pgSQL `DO $$ ... $$` block) that RE-READS `pg_policies` and `pg_proc` after the DDL and `RAISE EXCEPTION` on any forbidden posture.
- [ ] No byte edit to R1 corrective migration `20261003100000_f9b_slot_opening_binding_primitive/migration.sql`.
- [ ] No byte edit to F9 migration files (`20261003000000_f9_hr_staff_posting_write_rls/migration.sql`, `20261003000001_f9_hr_staff_posting_insert_rls/migration.sql`).
- [ ] No byte edit to `prisma/schema.prisma`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`.

### 1.2 Read posture

- [ ] `pg_policies` on `public.staffing_order_slots` contains `hrp_f9b_slots_project_select` (FOR SELECT) and DOES NOT contain `hrp_f9b_slots_manager_select`.
- [ ] The canonical SELECT policy uses `hrp_project_visible_for(so.project_id)` (the same function the rest of the RLS suite uses for `outsourcing_projects`).
- [ ] MKT, CTV, PM, sub-PM, DIRECTOR, SALE, WORKER, VENDOR_ADMIN, VENDOR_STAFF, HR_STAFF (assigned), HR_MANAGER, ADMIN all see the correct blast radius on `staffing_order_slots` (31/31 role-matrix tests pass ×3 fresh processes).

### 1.3 Write posture preserved (B-01 / B-02 / B-03)

- [ ] HR_STAFF direct UPDATE on `staffing_order_slots.slots_needed` is zero-row fail-closed (HRSTAFF-04).
- [ ] HR_STAFF direct INSERT on `staffing_order_slots` throws RLS (HRSTAFF-05).
- [ ] HR_STAFF direct DELETE on `staffing_order_slots` is zero-row fail-closed (HRSTAFF-06, RESTRICTIVE `hrp_staffing_order_slots_no_delete` `USING (false)`).
- [ ] `pg_policies` on `public.staffing_order_slots` does NOT contain any new DELETE policy.
- [ ] `pg_policies` on `public.staffing_orders` does NOT contain any broad `USING(true)` / `WITH CHECK (true)` relaxation.
- [ ] `pg_proc` `hrp_f9b_bind_slot_to_opening` is byte-equivalent to R1 (`prosecdef=true`, pinned `proconfig=search_path=...`).
- [ ] `routine_privileges` for `hrp_f9b_bind_slot_to_opening` is byte-equivalent to R1 (PUBLIC EXECUTE = 0; `app_user_writer` EXECUTE = 1; `app_user` EXECUTE = 1; `app_user_admin` EXECUTE = 1; `app_user_hr_manager` EXECUTE = 1).
- [ ] The narrowed role-gated write policies `hrp_f9b_slots_manager_insert` / `hrp_f9b_slots_manager_update` are preserved.

### 1.4 Application flow preserved

- [ ] `createOrReuseJobOpeningForSlot` post-lock re-read still raises `HRP_F9B_BINDING_DENIED_AFTER_REVOKE` (mapped to `NO_ACTIVE_ORDER_ASSIGNMENT` 403) — verified by the R2 AC suite ×3.
- [ ] `bindSlotToOpeningJobPostingTx` still goes through `public.hrp_f9b_bind_slot_to_opening(...)` `$executeRaw`.
- [ ] `assertMutationRole` gate in the SECURITY DEFINER primitive still rejects non-mutation roles.

### 1.5 Forbidden paths zero-touched

- [ ] No new `prisma migrate deploy` against `ep-shy-tree-*` (production host).
- [ ] No push / PR / merge / deploy beyond pushing the forward-only commit to the existing PR #88.
- [ ] No introduction of a separate admin / bypass Prisma client into the application runtime.
- [ ] No production DB / production migration / production deploy.

## 2. DELTA Findings

To be filled by Tier 3.

## 3. Tier 3 Disposition

To be filled by Tier 3. Possible dispositions:

- `DELTA_PASS` — adopt this AUDIT.md byte-exact; push to PR #88; wait for CI 4/4.
- `CHANGES_REQUIRED` — open a round-3 budget; do not push; do not merge.

---

*AUDIT authored 2026-10-04 ICT by Tier 1A (T1A). Pending Tier 3 LIGHT DELTA adoption. The R1 AUDIT (R1 Tier-3 LIGHT PASS at SHA `d777cf71`) is preserved byte-equivalent and is the audit chain's predecessor evidence.*
