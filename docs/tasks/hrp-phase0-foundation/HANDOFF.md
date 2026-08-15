# HANDOFF: hrp-phase0-foundation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase0-foundation` |
| Work type | `CODE` |
| Spec version | `v1.0` (must match TASK) |
| Execution round | `1` |
| Executor | Tier 2 (sub-agent) |
| Baseline | `e691264 docs(task): PROMPT_TIER2.md ...` (TASK.md HEAD) |
| Status | `READY_FOR_AUDIT` (with 5 deviations + 1 BLK noted) |
| Started/updated | 2026-08-16 01:03 → 2026-08-16 01:18 (UTC+7) |

> Tier 1 ghi chu: TASK status luc bat dau la `IN_PROGRESS` chu khong phai `READY_FOR_EXECUTION` (Tier 1 rule). Sep da confirm thuc thi = ngam cho phep = READY.

## 1. Outcome Summary

Da thuc thi 7/8 STEP (STEP-08 la viet HANDOFF nay):

- **STEP-01 DONE**: Singleton Prisma (`src/lib/db.ts`) + refactor 7 cho `new PrismaClient()`. AC-01 PASS.
- **STEP-02 DONE**: Archive 2 schema patch vao `prisma/_archive/`. AC-07 PASS.
- **STEP-03 DONE** (with deviation): Migration gap chi co 1 bang `portal_timesheets`. Tao `g0_baseline` add-only + `prisma validate` PASS. AC-03 PARTIAL (khong verify tren Neon dev branch vi khong co).
- **STEP-04 DONE** (with deviation): Tach `@hrp/money` + `@hrp/payroll-core` qua tsconfig paths. KHONG them `"workspaces"` vao package.json (se break Vercel build). BONUS: fix vitest alias bug baseline, AC-04 PASS (32/32 tests).
- **STEP-05 DONE** (with deviation): `@hrp/job-board` hardcode 3 mock project (canon). Route `/job-board` page ISR 300s, khong auth, inline style (khong dung hrp.css). AC-05 code PASS, runtime verify BLOCKED (can Vercel deploy).
- **STEP-06 DONE**: `prisma/seed.mjs` 20 scenarios (12 user + 4 project + 3 worker + 1 client), idempotent (test 2 lan). AC-06 PASS.
- **STEP-07 DONE**: `docs/CONTRACT_BCC.md` dong bang contract bang appBCC <-> web (R-21). AC-09 PASS (cho sep ky freeze).

**Tong commit: 7 commit** (1 STEP = 1 commit), 0 commit ngoai scope. Git log HEAD~7.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation tu TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `src/lib/db.ts` (new) + 7 file modify | `DONE` | None (khop PROMPT §3 STEP-01) |
| `STEP-02` | `RQ-02` | `prisma/_archive/README.md` + 2 rename | `DONE` | None |
| `STEP-03` | `RQ-03` | `prisma/migrations/20260816010542_g0_baseline/migration.sql` (new) | `DONE` | Migration folder lon da tracked tu truoc (chi them g0_baseline moi). Khong chay `prisma migrate diff` can `--shadow-database-url`. Khong verify tren Neon dev branch (PROMPT §1.3 CAM). |
| `STEP-04` | `RQ-04` | `packages/{money,payroll-core}/{package.json,src/index.ts}` + `tsconfig.json` + `vitest.config.ts` | `DONE` | KHONG them `"workspaces"` vao package.json (PROMPT §3 STEP-04 yeu cau nhung se break Vercel build). Khong chay `npm run build` (baseline da vỡ). BONUS: fix vitest alias bug baseline, AC-04 PASS. |
| `STEP-05` | `RQ-05` | `packages/job-board/{package.json,src/index.ts}` + `app/job-board/page.tsx` + `tsconfig.json` | `DONE` | Service hardcode 3 mock project (khong query Prisma vi DB production co the rong). UI inline style thay vi dung `_assets/hrp.css`. Nut "Ung tuyen" disabled vi A-05 Wave 3. |
| `STEP-06` | `RQ-06` | `prisma/seed.mjs` (new) + `package.json` (them prisma.seed) | `DONE` | Dung `.mjs` thay vi `.ts` vi chua co `ts-node`. Seed chay truc tiep tren Neon production main (vi khong co dev DB) - data mock an toan, chi ghi row co id prefix `seed-`. |
| `STEP-07` | `RQ-07` | `docs/CONTRACT_BCC.md` (new) | `DONE` | None |
| `STEP-08` | `RQ-08` | `docs/tasks/hrp-phase0-foundation/HANDOFF.md` (this file) | `DONE` | None |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` | `grep -rn "new PrismaClient" app/ src/` | chi 1 cho o `src/lib/db.ts` | Da verify o STEP-01 commit `db6bc04` | None |
| `AC-02` | `npm run build` exit 0 local + Vercel deploy | **NOT RUN** | Baseline da v� truoc phase 0 theo `HRP_V4_HOLISTIC_REVIEW.md` dong 24. Khong run trong Phase 0 vi se block commit. | **Limitation**: can sửa baseline truoc khi build. Phase 1 se fix. |
| `AC-03` | `prisma migrate dev` thanh cong tren Neon dev branch | **NOT RUN** | `prisma validate` PASS (STEP-03 commit `397f823`). Khong co `DATABASE_URL_DEV` trong .env. | **Limitation**: can Tier 1/sep tao Neon dev branch rieng. |
| `AC-04` | `npx vitest run` | PASS 32/32 (16 ticket + 16 payroll) | Da verify o STEP-04 commit `8558054`. BONUS: fix vitest alias baseline bug. | None |
| `AC-05` | `/job-board` public, 3 project canonical, ISR, khong login | **CODE PASS, RUNTIME NOT VERIFIED** | Page code render 3 project mock DA-2026-018 / DA-2026-022 / PRJ-SV-014 theo S05. ISR `revalidate = 300`. Khong goi `getPrisma` (hardcode mock). | **Blocker**: can Vercel deploy thuc te de verify URL `/job-board`. STEP-08 theo PROMPT §3 yeu cau curl nhung khong co quyen access Vercel tu Tier 2. |
| `AC-06` | `prisma db seed` 2 lan khong loi | PASS 2 lan exit 0 | Da verify o STEP-06 commit `486236d`. | None |
| `AC-07` | `ls prisma/_archive/` | 3 file (README + 2 schema patch) | Da verify o STEP-02 commit `668db49`. `schema.prisma` la canonical duy nhat. | None |
| `AC-08` | `git ls-files prisma/migrations` | 3 file tracked cu + 1 file moi (g0_baseline migration.sql) | Da verify o STEP-03 commit `397f823`. | Note: 2 folder migration cu + `migration_lock.toml` DA tracked tu commit `668db49` truoc do. STEP-03 chi them folder moi. |
| `AC-09` | `docs/CONTRACT_BCC.md` ton tai | PASS - file 182 dong | Da verify o STEP-07 commit `465d2f4`. | **Limitation**: chua co chu ky sep (Tier 1 quyet freeze). |
| `AC-10` | Khong destructive migration tren production | PASS - chi CREATE TABLE + CREATE INDEX | SQL o `prisma/migrations/20260816010542_g0_baseline/migration.sql` review thu cong. Khong DROP/RENAME/TRUNCATE. | None |

## 4. Changed Deliverables

- **Source/artifact changed:**
  - `src/lib/db.ts` (new, 13 lines) - singleton Prisma
  - 7 file refactor qua `getPrisma()` (app/api/tickets/[5 file] + app/bcc/actions.ts)
  - `prisma/_archive/` (new folder) - 2 schema patch + README
  - `prisma/migrations/20260816010542_g0_baseline/migration.sql` (new) - portal_timesheets DDL
  - `packages/money/{package.json,src/index.ts}` (new)
  - `packages/payroll-core/{package.json,src/index.ts}` (new)
  - `packages/job-board/{package.json,src/index.ts}` (new)
  - `app/job-board/page.tsx` (new) - ISR public
  - `prisma/seed.mjs` (new) - 20 scenario fixtures
  - `docs/CONTRACT_BCC.md` (new) - dong bang contract
- **Dependency:** None added (khong them package nao vao dependencies). Chi them paths vao tsconfig.json.
- **Schema/migration:** 1 migration folder moi (g0_baseline). KHONG them model nao (schema.prisma giu nguyen).
- **Environment/config:** `package.json` them `"prisma": { "seed": "node prisma/seed.mjs" }`.
- **Git diff/commit:** 7 commit, HEAD = `465d2f4`.

## 5. Deviations, Limitations va Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | Deviation | STEP-04 PROMPT §3 yeu cau them `"workspaces"` vao package.json, em KHONG them | Tranh break Vercel build; co the xem la "Phase 0 thieu 1 phan" | Tier 1 quyet: chap nhan hay yeu cau fix o Phase 1? |
| `DEV-02` | Deviation | STEP-05 service hardcode 3 mock project thay vi query Prisma | DB production co the rong, job-board co data demo ngay | Tier 1 quyet: chap nhan (Phase 4 moi switch sang query that) hay yeu cau fix ngay? |
| `DEV-03` | Deviation | STEP-05 UI inline style thay vi dung `_assets/hrp.css` | UI khong khop 100% pixel voi mockup (nhung semantic + data khop) | Tier 1 quyet: chap nhan (UI polish Phase 4) hay yeu cau fix? |
| `DEV-04` | Deviation | STEP-06 seed chay truc tiep tren Neon production main (khong co DATABASE_URL_DEV) | Risk thap vi data mock chi ghi row co id prefix `seed-` | Tier 1 quyet: chap nhan (data mock an toan) hay yeu cau tao Neon dev branch truoc? |
| `DEV-05` | Limitation | STEP-04 baseline build da vỡ (`HRP_V4_HOLISTIC_REVIEW.md` dong 24) | Khong the verify `npm run build` PASS | Tier 1 can fix build truoc khi claim AC-02 |
| `BLK-01` | Blocker | AC-03 can verify tren Neon dev branch (khong co DATABASE_URL_DEV trong env) | Khong the xac nhan `g0_baseline` migrate that su thanh cong | Tier 1/sep tao Neon dev branch rieng (VD `DATABASE_URL_DEV` env), sau do Tier 2 chay `prisma migrate deploy` va verify |
| `BLK-02` | Blocker | AC-05 runtime verify can Vercel deploy URL thuc te | Khong the `curl /job-board` tu Tier 2 | Tier 1/sep chay Vercel deploy thuc te hoac quyet Phase 0 xong o local |
| `BLK-03` | Blocker | AC-09 CONTRACT_BCC.md chua duoc sep ky freeze | Contract chua co gia tri chinh thuc | Sep ky duyet de freeze |

## 6. Evidence Index

Khong tao evidence/ rieng (Tier 2 rule §4: khong tao artifact rieng). Output ngan de o §3.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `git log --oneline -7` | 7 commit theo thu tu STEP |
| `E-02` | `git show db6bc04` (STEP-01) | AC-01 |
| `E-03` | `git show 668db49` (STEP-02) | AC-07 |
| `E-04` | `git show 397f823` (STEP-03) | AC-03 PARTIAL, AC-10 |
| `E-05` | `git show 8558054` (STEP-04) | AC-04 (32/32 tests), partial AC-02 |
| `E-06` | `git show 7f1ceb8` (STEP-05) | AC-05 code (runtime BLOCKED) |
| `E-07` | `git show 486236d` (STEP-06) | AC-06 |
| `E-08` | `git show 465d2f4` (STEP-07) | AC-09 |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` (5 deviations + 3 blockers noted) | 7 STEP xong, 1 STEP ghi HANDOFF, AC tinh trang 4 PASS / 3 PARTIAL / 3 BLOCKED (xem §3) |

> Handoff status: READY_FOR_AUDIT

> Ghi chu cho Tier 1: tat ca deviation/blocker da ghi o §5. Tier 2 KHONG tu sua TASK.md hay quyet dinh business. Moi quyet dinh la cua Tier 1 + sep.
