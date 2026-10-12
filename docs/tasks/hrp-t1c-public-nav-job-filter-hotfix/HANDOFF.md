# HANDOFF — `hrp-t1c-public-nav-job-filter-hotfix`

## Delivery

- Status: `READY_FOR_REVIEW`; stopped before merge/deploy.
- Branch: `codex/t1c-public-nav-job-filter-hotfix`
- Baseline: `d62df50e0a5ab48a5bba6cdc0c3fb1d033ff9f6f` (`origin/main`)
- Contract commit: `a0a597455a11c5383ebd99558c5d0aafa662a3bc`
- Implementation SHA: `e7c5b350dd8ebbcb05623856a96f772a3f7e5c75`

## Change

- `/viec-lam` now exposes keyword, area, and salary filters only. The `shift` query is ignored, omitted from generated URLs, and is no longer passed to the listing service.
- Homepage callers no longer retain or emit shift state.
- Public navigation has `Trang chủ` → `/` and `Việc làm` → `/viec-lam`; one shared link list drives desktop and mobile, with exact root matching and `/viec-lam` matching its detail routes.
- No API, service, schema, database, dependency, or homepage-content changes.

## Verification

- Targeted Vitest: `103/103` passed (T1 run).
- Full unit suite: `324` files, `5,159` passed, `9` skipped, `0` failed.
- `pnpm run typecheck`: pass.
- ESLint changed files: `0` errors; existing warnings only.
- `pnpm run build`: pass. Existing Edge/CSS warnings remain; prerender logged missing local `DATABASE_URL` while the optional FloatingChatActions settings read fell back.
- `verify-task.ps1`: pass.
- `verify-encoding.mjs`: `8/8` changed text files pass UTF-8 no-BOM.
- `git diff --check`: pass.

## Stop gate

No merge or deployment performed. T0 may review the PR after it is opened; implementation source is frozen at the SHA above.
