# Neon Branch Classification
# Task: hrp-v6-credential-rotation-posture
# RQ-08: Classify Neon branches
# Baseline: main @ f853a3cfb7ae
# Date: 2026-09-08

---

## 0. Classification Legend

| Tag | Meaning |
|-----|---------|
| `DELETE` | Branch should be deleted. Safe to remove. |
| `KEEP` | Branch must be kept. Do NOT delete. |
| `ROTATE` | Branch needs credential rotation, keep otherwise. |

---

## 1. Branch Inventory

| Branch Name | Neon Branch ID | Classification | Reason |
|------------|---------------|----------------|--------|
| `pre-mp2-remediation-2026-08-28` | (unknown) | `DELETE` | Remediation branch from 2026-08-28. No longer needed. Function replaced by `hrp_mp2_test`. |
| `hrp_mp2_test` | `br-misty-cell-az3nx5l3` | `KEEP` | **DO NOT DELETE.** This is the ONLY branch with sufficient RLS test matrix. Required for gl-07 execution. |
| `main` | (production) | `KEEP` | Production branch. Rotate credentials per rotation-plan.md. |
| `hrp-v6-p1-labor-profile-schema` | (unknown) | `KEEP` | Active development branch. Rotate credentials if needed. |
| Other branches | (unknown) | `ROTATE` | Rotate credentials when rotating main/prod. |

---

## 2. Branch Details

### 2.1 `pre-mp2-remediation-2026-08-28` — DELETE

**Status:** DELETE — safe to remove

**Reason:** This branch was created for emergency RLS remediation on 2026-08-28.
Its purpose was to apply RLS fixes and verify they worked. The fixes have since been
merged into `main` and `hrp_mp2_test`. This branch is no longer needed.

**Action:** Owner/OP should delete this branch from Neon console.

**Timeline:**
- Created: 2026-08-28 (emergency RLS fix)
- Used for: RLS remediation verification
- Superseded by: `hrp_mp2_test` (which has the RLS fixes merged in)
- Recommended action: DELETE after verifying `hrp_mp2_test` has all necessary schema

**Verification command (for Owner):**
```bash
# Verify hrp_mp2_test has the RLS fixes
# (check via Neon console or pg_dump)
```

### 2.2 `hrp_mp2_test` — KEEP (DO NOT DELETE)

**Status:** KEEP — **CRITICAL: Do not delete**

**Neon Branch ID:** `br-misty-cell-az3nx5l3`

**Reason:** This is the ONLY branch with sufficient RLS test coverage matrix.
It was used for the gl-07 marketplace launch proof and contains all RLS fixes
from the pre-mp2-remediation branch. Deleting this branch would break the
RLS test matrix and halt gl-07 execution.

**Risk of deletion:** HIGH — loss of RLS test matrix, data may not be recoverable
without Neon point-in-time recovery.

**Action:** **DO NOT DELETE.** Rotate credentials if needed, but keep the branch.

**Rotation action:** When rotating production credentials, also rotate this branch's
credentials to maintain parity. Update `.env.preview` (used for preview deploys) accordingly.

### 2.3 `main` (production) — KEEP + ROTATE

**Status:** KEEP + ROTATE credentials

**Reason:** Production branch. Credentials must be rotated per rotation-plan.md.

**Action:** Owner/OP rotates `neondb_owner`, `cloud_admin`, `app_user_writer`
credentials per the rotation sequence. Update `DATABASE_URL_ADMIN` in Vercel env.

---

## 3. Deletion Plan for pre-mp2-remediation-2026-08-28

Owner/OP should delete this branch using the Neon console:

```
1. Log in to Neon console: https://console.neon.tech
2. Navigate to: Branches -> pre-mp2-remediation-2026-08-28
3. Click "Delete branch"
4. Confirm deletion
5. Verify hrp_mp2_test still has all necessary schema
```

**Precautions:**
- Verify `hrp_mp2_test` has the RLS fixes before deleting
- Do NOT delete if there are unmerged changes that need to be preserved
- If uncertain, keep the branch until gl-07 is fully accepted

---

## 4. Evidence

| Check | Source | Result |
|-------|--------|--------|
| Branch list | Neon console | `pre-mp2-remediation-2026-08-28`, `hrp_mp2_test` (br-misty-cell-az3nx5l3), `main` |
| hrp_mp2_test RLS matrix | Task gl-07 evidence | Only branch with full RLS test coverage |
| Pre-mp2-remediation purpose | PLANNER_HANDOVER.md §13 | Emergency RLS fix from 2026-08-28, superseded |

---

## 5. Owner Action Items

| Priority | Branch | Action |
|----------|--------|--------|
| P0 | `pre-mp2-remediation-2026-08-28` | Delete from Neon console (after verifying hrp_mp2_test) |
| P1 | `hrp_mp2_test` | DO NOT DELETE. Rotate credentials when rotating prod. |
| P1 | `main` | Rotate credentials per rotation-plan.md |
| P2 | Other dev branches | Rotate credentials when rotating main/prod |
