---
name: databases
description: Use when HRP needs to design Prisma schema, write SQL/queries, optimize indexes, manage migrations, or audit data integrity (tiền, permission). Postgres + Prisma focus because HRP uses them.
license: HRP-Internal
---

# Databases (Postgres + Prisma)

> **HRP stack**: Next.js/TypeScript + **PostgreSQL** + **Prisma**. MongoDB không trong scope HRP hiện tại → skip.

## When to Use

- Tier 1 design schema/data model → ghi vào `TASK.md > Acceptance`.
- Tier 2 viết Prisma query/migration → ghi evidence vào `HANDOFF.md`.
- Tier 3 audit data integrity (money, permission, scope) → dùng `testing-protocol > Permission/data scope`.

## Quick Start — Prisma

```bash
# Xem schema
cat prisma/schema.prisma

# Generate migration
npx prisma migrate dev --name <slug>

# Validate
npx prisma validate

# Format
npx prisma format
```

## Best Practices

- **Money/Decimal**: dùng `Decimal` (không `Float`) để tránh floating-point error.
- **Foreign keys**: luôn định nghĩa `@relation` rõ ràng.
- **Indexing**: foreign keys + filter columns thường query.
- **Soft-delete**: dùng `deletedAt DateTime?` thay vì xóa cứng.
- **Audit columns**: `createdAt`, `updatedAt`, `createdBy`, `updatedBy` cho mọi table quan trọng.
- **Migration review**: review SQL output trước khi apply production.

## Operations

```sql
-- Connect
psql "$DATABASE_URL"

-- Performance
EXPLAIN ANALYZE SELECT ...;

-- Maintenance
VACUUM ANALYZE;
```

## References

- `references/postgresql-patterns.md` — indexes, transactions, row-level security
- `references/prisma-migration-checklist.md` — pre-apply checklist
- `references/data-integrity-rubric.md` — tiêu chí audit cho data tier
