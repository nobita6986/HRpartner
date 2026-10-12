# T1B Gates Evidence Index

## Quality Gates (PASS)

| Gate | Result | Notes |
|------|--------|-------|
| typecheck | 0 errors | npx tsc --noEmit |
| lint | 0 errors | 973 warnings pre-existing in `tests/db/*` |
| full unit (vitest) | 4761 PASS / 9 skipped | 298 test files |
| prisma validate | PASS | DATABASE_URL/ADMIN set |
| next build | PASS | 41.4 kB middleware |
| verify-encoding | PASS | UTF-8 no-BOM, 0 changed |
| git diff --check | PASS | no whitespace errors |

## Targeted Worker/API Tests (112 PASS)

- `src/domains/workforce/__tests__/worker.service.test.ts` — 41 tests
- `app/api/workers/__tests__/route-get-patch-delete.test.ts` — 16 tests
- `app/admin/workers/[id]/__tests__/worker-detail-sections.static.test.ts` — 17 tests
- `app/admin/workers/__tests__/workers-terminology.static.test.ts` — 9 tests
- `app/admin/workers/__tests__/workers-list-cta.test.tsx` — 8 tests
- `src/domains/admin/workers-route.test.ts` — 4 tests
- `src/domains/security/workers-projection.contract.test.ts` — 4 tests
- `src/domains/workforce/__tests__/worker-ui.test.ts` — 2 tests
- `src/shared/security/required-relation-sweep.static.test.ts` — 11 tests (40→43 hits)

## Key Business Invariants Tested

1. POST `/api/workers` → 410 GONE `WORKER_LEGACY_CREATE_DISABLED` (no Worker-create path)
2. CTA `/admin/workers` → `<Link>` to `/admin/labor-profiles/new` (no inline modal)
3. `*` mask submit → 422 `WORKER_MASKED_INPUT_REJECTED`
4. ownership field by HR_MANAGER → 403 `FORBIDDEN_OWNERSHIP`
5. `userId`/`accountUserId`/`workerId`/`id` in PATCH body → 400 `INVALID_INPUT`
6. 14 dep sweep cases → 409 `WORKER_NOT_DELETABLE` (typed facts)
7. Delete orphan → 200, advisory lock acquired 1×, audit `WORKER_PERMANENT_DELETE`
8. TERMINATED status → row giữ nguyên, không cascade
9. Sensitive field khi thiếu permission → `***` mask; CCCD issued metadata → null
10. CAS `expectedUpdatedAt` lệch → 410 `STALE_VERSION`
11. Row scope HR_STAFF ngoài `assignedToId` → null (404 fail-closed)
12. Row scope PM qua `assignments.project.pmUserId` → null ngoài scope
