# HANDOFF — `hrp-admin-ux-hotfix-2` (T1C, rev. 1)

> Tier-1 implementation handoff. Round 2 of HRP admin UX hotfixes (post-PR-#116).
> Read-only on data side (no migration, no schema, no auth boundary); additive on
> UI side (4 new operational columns per list + delete-history page + static font
> guard). All gates green on 2026-10-07 against baseline `8f93178` (origin/main).

## Implementation SHA

| Field | Value |
|---|---|
| Branch | `codex/t1c-admin-ux-hotfix2` |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` (origin/main) |
| Implementation SHA | (set after commit) |
| Frozen delivery | YES |

## In-scope surfaces (20 files, +1757 / −143)

- `app/admin/workers/page.tsx` + `app/api/workers/route.ts` — 4 new cols, drop `Thao tác`/`Xem`.
- `app/admin/workers/[id]/worker-delete-button.tsx` + `[id]/page.tsx` — banner 2.5s + `router.push`.
- `app/api/admin/worker-delete-history/route.ts` (NEW) + `app/admin/workers/delete-history/page.tsx` (NEW).
- `app/admin/labor-profiles/page.tsx` + `src/domains/talent/labor-profile.read-service.ts` — 4 new cols.
- `app/admin/vendors/page.tsx` — subhead copy sweep.
- `app/admin/media/media-library-client.tsx` — responsive padding/grid/sidebar.
- `app/admin/__tests__/admin-bvp-font.static.test.ts` (NEW) — Be Vietnam Pro regression guard.

## Decisions (DEC-01..11 in TASK.md §4)

Success banner `Đã xóa người lao động <fullName> (Mã: <userId>). Đang chuyển về danh sách…` 2.5s → `router.push('/admin/workers')`. Delete history read `audit_logs` (`entityType=Worker & action=WORKER_PERMANENT_DELETE`); ADMIN/HR_MANAGER/DIRECTOR only; PII mask per `canSeeSensitive`. Worker 4 cols from canonical relations (no `createdAt` fallback, no `assignedToId` for commission). LaborProfile 4 cols (no CCCD, 1 row/profile). Subhead copy workers = `"Quản lý thông tin và trạng thái người lao động."`; vendors = `"Quản lý thông tin, liên hệ và trạng thái nhà cung cấp."`. No `Phân hệ M*` left in operator copy. Font guard. Media responsive.

## Gates (2026-10-07)

| Gate | Result |
|---|---|
| `npx --no-install prisma validate` | PASS |
| `npm run test:unit` | 4980 passed, 5 failed (3 pre-existing infra: `required-relation-sweep`, `design-tokens`, `workers-projection`); 0 from T1C code |
| `npm run typecheck` | PASS (0 errors after fixing 13 Prisma `null` narrowing) |
| `npm run lint` | 0 errors, 985 warnings (all pre-existing infra) |
| `npm run build` | Compiled successfully in 41s |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | PASS (20 files, strict UTF-8 no-BOM) |
| `git diff --check HEAD` | PASS |

## Targeted static tests (T1C, 42/42 pass)

`worker-list-columns` (9), `worker-delete-toast` (4), `labor-profile-list-columns` (6), `media-responsive` (6), `admin-bvp-font` (17).

## Fence updates (T1C-driven)

`labor-profiles-separation` (5→9 cols), `workers-list-cta` (`router.push` row nav), `workers-terminology` (drop `Thao tác` assertion), `worker-delete-button` (success path = `router.push` + 2500ms + toast testid).

## BLOCKER notes

None. DEC-09 rules held: `—` for null relations; no `createdAt` fallback; `assignedToId` never used for commission.

## Next gate

`PUSH_PR_CI_MERGE` — push branch, open PR, wait for CI 4/4 green, **stop before merge**, do not deploy.
