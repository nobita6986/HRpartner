# Archived Prisma Schema Patches

These Prisma schema patch files are **deprecated** as of Phase 0 (16/08/2026). The canonical schema is `../schema.prisma` only.

- `schema-v3.1-patches.prisma` — patches from v3.1 plan (out-of-date)
- `schema-m7-tickets.prisma` — Module 7 ticket patches (merged into canonical)

Do not import from these files. For any new model change, edit `../schema.prisma` and generate a new migration under `../migrations/<timestamp>_<name>/`.
