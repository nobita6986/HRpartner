# Tier 3 LIGHT Audit Report - Round 1
_Pending Tier 3 Audit..._

**Tier 3 Auditor Checklist for Round 1:**
- Kiểm tra AD2: param `employmentStatus` vs `status` precedence, whitelist 4 enum, 400 Invalid không gọi Prisma.
- Kiểm tra AD3: GUC/RLS/data scope trong manual join.
