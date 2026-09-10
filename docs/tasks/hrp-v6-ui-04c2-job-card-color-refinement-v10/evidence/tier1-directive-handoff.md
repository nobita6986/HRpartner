# Tier 1 directive -- 04c2 job card color refinement v10 v1.0 thi cong

> TIER 1 DIRECTIVE CHO TIER 2. Thi cong trong worktree hien tai tai HEAD `9f593fa` (04c1 source committed, footer + ContactForm da doi). Tier 2 duoc phep sua source + commit path-scoped + Tier 1 review + commit final. Tier 1 push len origin/main theo Tier 0 directive [TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH] (10/09/2026).
> Ngay: 2026-09-10 22:55 (UTC+7). Co so: `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md` v1.0 `READY_FOR_EXECUTION`; `verify-task.ps1` PASS (0 warning, 0 error).
> 16 Owner decisions da chat tai `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/owner-job-card-color-refinement-decisions.md` (2026-09-10). Tier 2 doc file nay TRUOC KHI bat dau.

## 1. Boi canh Tier 1 da do (cap nhat Phase 2)

- `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md`: **PASS** (0 warning, 0 error). TASK contract v1.0 hop le, khong con placeholder.
- HEAD hien tai: `9f593fa89c840d3ca48d6fbf016f996a1b9bc005` -- feat(ui): hrp-v6-ui-04c1-footer-tweak-r2 fast round 1 (Tier 2 commit 04c1) + planning commits. Tier 2 capture baseline tai STEP-01 ngay truoc khi sua.
- Tier 0 directive `docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md` (10/09/2026) cho phep 04c2 commit + Tier 1 push production (thay the lenh cu "Tier 2 KHONG push").
- Tier 2 KHONG push len origin/main (Tier 1 push o cuoi round Phase 2, sau ca 2 commit).
- Source production `src/domains/job-board/components/landing/featured-job-card.tsx` con o baseline R3 `8c6fd03` (Phase 1 chi sua 04c1 footer + ContactForm; 04c2 file chua duoc sua).
- Source production `src/domains/job-board/components/landing/featured-job-card.test.ts` con o baseline R3 `8c6fd03`.
- 8 file dirty R3 + composition/footer `04b767e` + R2 correction `9e51917`: Tier 2 khong revert.

## 2. Tier 2 chi duoc cham 3 file

```
src/domains/job-board/components/landing/featured-job-card.tsx
src/domains/job-board/components/landing/featured-job-card.test.ts
docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/** (HANDOFF.md + evidence)
```

Moi file khac thuoc §0 Forbidden paths trong TASK.md. Tier 2 KHONG mo `app/globals.css`, KHONG them package (chi dung `lucide-react` da co), KHONG them icon library moi, KHONG mo `tailwind.config.*`.

## 3. Source baseline da doc

Tier 1 da doc `src/domains/job-board/components/landing/featured-job-card.tsx` luc 22:50:

- Container: `bg-white border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200` (R3 surface, Owner #16 giu).
- Header: `<HrMonogram size={48} ...>` + `<h3 className="text-lg font-semibold ..." title={job.title}>` + `HRP Việt Nam`.
- Ribbon: `bg-orange-500/75` neu `badgeType === 'urgent'` (compact, top-right, pointer-events-none).
- Body metadata: `<MapPin>` + `<Clock3>` slate-500.
- Footer: `<div className="mt-auto flex items-center gap-2 border-t border-slate-100 p-4">`
- Salary pill: `<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">`.
- CTA `Xem chi tiet`: `<Link href={href} className="inline-flex ... bg-blue-600 ... text-white ... hover:bg-blue-700 ...">` -- can doi sang `border border-slate-300 bg-white text-slate-700 hover:bg-slate-50` (Owner #1, RQ-01).
- CTA `Ung tuyen`: `<button ... disabled={preview} onClick={preview ? undefined : onApply} ... className="... bg-slate-100 text-slate-700 ... hover:bg-slate-200 ..."><span className="hidden sm:inline">Ung tuyen</span>` -- can doi className + bo `hidden sm:inline` (Owner #2 + #14, RQ-02 + RQ-14).
- ApplyModal wiring: `type="button"` + `disabled={preview}` + `onClick` giu nguyen (RQ-19 invariant).

## 4. Viec Tier 2 phai lam (theo STEP ID trong TASK.md)

### Buoc 1 -- Capture baseline (STEP-01)

Tier 2 capture baseline ngay truoc STEP-02:

```powershell
git rev-parse HEAD > docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/exec-head-before.txt
git status --short > docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/working-tree-before.txt
npm run test:unit --reporter=basic 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/expected-failure-set-before.txt
```

`exec-head-before.txt` ky vong `9f593fa...`. Tier 2 ghi nhan hash that vao file. Tier 2 KHONG dirty working tree ngoai task 04c2.

### Buoc 2 -- Skeleton invariant guard (STEP-02)

Tier 2 doc:
- `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/owner-job-card-color-refinement-decisions.md` (16 lua chon Owner + 5 interaction invariants)
- TASK.md §1.1 + §1.2 + §1.3 + §0 + §4 RQ-00

Tier 2 ghi nhan trong HANDOFF.md §1 Outcome rang da doc skeleton invariant + 16 Owner decisions + 5 interaction invariants.

### Buoc 3 -- STEPS 03-12 thi cong

Anh xa RQ -> diff cu the (Tier 2 lam theo thu tu STEP-03 -> STEP-12 trong TASK.md):

- **STEP-03 / RQ-01**: doi className CTA `Xem chi tiet` tu `bg-blue-600 hover:bg-blue-700 ...` sang `border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`. Giu `href={href}` invariant (RQ-18).
- **STEP-04 / RQ-02 + RQ-19 + RQ-20**: doi CTA `Ung tuyen` className tu subtle slate-100 sang `bg-primary text-white hover:bg-primary-dark`. Giu `type="button"` + `disabled={preview}` + `onClick={preview ? undefined : onApply}`. Wrap `e.stopPropagation()` + `e.preventDefault()` de chan bubble neu can (RQ-19). Giu accessible name `Ung tuyen nhanh` (RQ-13). Verify token `primary` resolve = `rg "primary:" tailwind.config.*` hoac `app/globals.css`. Neu token chua co, dung `bg-primary-dark` semantic (tim trong tailwind.config); neu khong co hon, escalate Tier 1.
- **STEP-05 / RQ-03**: them `border border-emerald-100` cho salary pill (tuy chon). Giu `bg-emerald-50 text-emerald-700`.
- **STEP-06 / RQ-04**: doi `<h3 className="text-lg font-semibold leading-tight text-slate-900 transition group-hover:text-blue-700 mb-0.5">` thanh `<h3 className="text-base font-semibold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-blue-700 mb-0.5" title={job.title}>`. **Luu y**: R3 chua co `line-clamp-2` o title (theo R3 baseline EV-??). Tier 2 them `line-clamp-2` va `title` attribute theo RQ-04. Ngoai ra, can chinh `transition group-hover:text-blue-700` (blue hover) -- Tier 2 co the giu hoac chuyen sang `text-slate-900` (Owner delta khong de cap den hover color); R3 da co `group-hover:text-blue-700`, RQ-16/11 surface GIU -- hover blue khoang chap nhan duoc.
- **STEP-07 / RQ-06 + RQ-09**: doi footer `p-4 border-t border-slate-100` thanh `px-4 py-3 border-t border-slate-200`.
- **STEP-08 / RQ-07 + RQ-08**: doi footer `flex items-center gap-2 border-t border-slate-100 p-4` thanh `flex items-center justify-between flex-wrap gap-2 sm:gap-3 border-t border-slate-200 px-4 py-3`. De salary o trai (`shrink-0` hoac `flex-shrink-0`), CTA group o phai (`shrink-0`). Wrap `flex-wrap` de cho phep wrap tren mobile.
- **STEP-09 / RQ-21**: dam bao KHONG co `pr-[72px]` wrapper title. Ribbon `pointer-events-none` absolute top-right (da co o R3).
- **STEP-10 / RQ-13 + RQ-14**: ARIA ten hanh dong ro. CTA that accessible name `Ung tuyen nhanh` (giu nguyen). Preview accessible name `Ban xem truoc` (giu nguyen). Mobile label: **BO `hidden sm:inline`** -- cho phep label `Ung tuyen` hien thi tren mobile.
- **STEP-11 / RQ-15**: sua `featured-job-card.test.ts` (Tier 1 da dua vao allowlist v1.0). Bo sung/cap nhat test co y nghia cho: (a) accessible label CTA/preview; (b) preview disabled; (c) hai CTA khong kich hoat click card ngoai y muon (test bubble prevention). KHONG viet test chi sao chep danh sach class.
- **STEP-12 / RQ-10/11/12/16/17/18/21**: smoke-check invariants GIU nguyen.

### Buoc 4 -- Mandatory gates

```powershell
npm run typecheck 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/typecheck.txt
npm run test:unit --reporter=basic 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/test-unit.txt
npm run build 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/build.txt
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/TASK.md -HandoffPath docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/HANDOFF.md
```

Tat ca gates phai PASS hoac PASS WITH WARNINGS khong release-blocking.

### Buoc 5 -- AC evidence files

Tao evidence files theo §6.1 TASK.md (AC-00..AC-14):

- `ac00-invariants.txt`
- `ac01-xem-chi-tiet-ghost.txt`
- `ac02-ung-tuyen-cam.txt`
- `ac03-salary-pill.txt`
- `ac04-title.txt`
- `ac05-button-font.txt`
- `ac06-footer-padding-separator.txt`
- `ac07-footer-layout.txt`
- `ac08-aria.txt`
- `ac09-mobile-label.txt`
- `ac10-test.txt`
- `ac11-surface.txt`
- `ac12-regression.txt`
- `ac-gates.txt`

Moi file chua:
```
## AC-XX verification
Command: <rg / Select-String / npm>
Expected: <KQ mong doi>
Measured: <KQ thuc te>
Result: PASS / FAIL
```

### Buoc 6 -- Fill HANDOFF.md theo compact canonical

Tier 2 cap nhat `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/HANDOFF.md`:

**Section 0 Control**: Baseline = commit hash that tu `evidence/exec-head-before.txt` (ky vong `9f593fa...`).

**Section 1 Outcome**:
- Delivered: bullet tung RQ/STEP da lam.
- Not delivered: `<None>`.
- Changed: 2 file allowlist (`featured-job-card.tsx` + `featured-job-card.test.ts`).
- Lane escalation: `<No>`.

**Section 2 Acceptance evidence**: moi AC-XX co evidence cite (E-XX) + Result + Limitation None.

**Section 3 Evidence registry**: E-01..E-15 mapping artifact.

**Section 4 Deviations**: neu co pre-existing test failure tang so vs baseline (Tier 2 captured STEP-01) BLK-01; neu khong giam/giu nguyen `<None>`. Tier 2 phai so sanh ky voi `evidence/expected-failure-set-before.txt`.

**Section 5 Final status**: mot cau ket luan + `> Handoff status: READY_FOR_REVIEW` (FAST).

### Buoc 7 -- Commit path-scoped

```powershell
# Kiem tra allowlist truoc commit
git status --short
# Cho phep: M src/domains/job-board/components/landing/featured-job-card.tsx,
#           M src/domains/job-board/components/landing/featured-job-card.test.ts,
#           A docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/HANDOFF.md,
#           A/?? docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/** (cac file moi)

git add src/domains/job-board/components/landing/featured-job-card.tsx src/domains/job-board/components/landing/featured-job-card.test.ts docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/HANDOFF.md docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/

git status --short   # verify chi con untracked ngoai task

git commit -m "feat(ui): hrp-v6-ui-04c2-job-card-color-refinement-v10 fast round 1 -- apply 16 Owner decisions + 5 interaction invariants"
```

Tier 2 KHONG push origin/main (Tier 1 push o cuoi round ca 2 phase).

## 5. Dieu KHONG duoc lam

- KHONG sua `TASK.md` them. Tier 1 owns TASK.md; Tier 2 chi fill HANDOFF + evidence.
- KHONG revert source accepted: `04b767e` (composition/footer), `9e51917` (R2 correction R1), `8c6fd03` (R3 source) + planning commits `ed3b784`, `01c54dd`, `2ee3b55`, `0e0320b`, `fdf9a03`, `9f593fa`.
- KHONG mo `app/globals.css`, `tailwind.config.*`, `package.json`, KHONG them package icon.
- KHONG sua `salaryLabel()` helper, ribbon className, ApplyModal UX props (onApply + onClick + disabled). Tier 2 chi chinh className.
- KHONG them wrapper `Link` wrap card neu hien khong co (RQ-17 invariant: card outer click invariant giu nguyen state hien tai).
- KHONG viet test chi sao chep danh sach class (Owner #15).
- KHONG stage untracked ngoai task: docs/AI_PROJECT_BRIEF.md, docs/TIER0_HANDOVER.md, docs/V6/CRM_CSKH_INTEGRATION_PLAN.md, docs/V6/hrp-crm-target-architecture.*, docs/prompts/TIER0_UI04_*.md, docs/prompts/TIER1_*.md, docs/reports/**, docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/**, docs/tasks/hrp-v6-ui-04a-visual-polish/**, docs/tasks/hrp-v6-ui-04b-pagination-admin/**, docs/tasks/hrp-v6-ui-04b-vis-correction-r1/**, docs/tasks/hrp-v6-ui-04b-job-card-interaction-r2/**, docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/**, docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/, docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/ (tru cac file Tier 2 tao ra), docs/tasks/hrp-v6-ui-04d-section-render/**.
- KHONG push origin/main (Tier 1 push o cuoi round ca 2 phase).
- KHONG cai tool do (axe-core, Lighthouse, CDP, pa11y).
- KHONG tu phat hanh ACCEPTED verdict. Owner live visual review (AC-14) thuoc Owner sau deploy.

## 6. Khi gate PASS

Tier 2 bao lai Tier 1 voi:
- `git log --oneline -1` (commit hash that -- local, KHONG push)
- `git diff --name-only origin/main..HEAD` (de Tier 1 doi chieu allowlist)
- Output cuoi `verify-task.ps1` + `verify-handoff.ps1`
- So AC co evidence row (ky vong 14-15 AC)
- Bat ky deviation/blocker nao

Tier 1 review FAST, resolve finding neu co, COMMIT CUOI + PUSH production. Ca Phase 1 + Phase 2 ACCEPTED -> push HEAD len origin/main 1 lan (Tier 0 directive §Cuoi round).
