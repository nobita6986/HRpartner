# Tier 1 directive — 04c1 footer tweak r2 v1.0 thi cong (round Tier 0 push)

> TIER 1 DIRECTIVE CHO TIER 2. Thi cong trong worktree hien tai tai HEAD `0e0320b` (commit planning 04c2 + 04c1). Tier 2 duoc phep sua source + commit path-scoped + Tier 1 review + commit final. Tier 1 quyet dinh push len origin/main theo Tier 0 directive 10/09/2026.
> Ngay: 2026-09-10. Co so: `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md` v1.0 `READY_FOR_EXECUTION`; `verify-task.ps1` PASS (0 warning, 0 error).
> 16 Owner decisions da chat tai `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md`. Tier 2 doc file nay TRUOC KHI bat dau.

## 1. Boi canh Tier 1 da do (cap nhat)

- `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md`: **PASS** (0 warning, 0 error). TASK contract v1.0 hop le, khong con placeholder.
- HEAD hien tai: `0e0320b3053294a8425fb08bba371382ce77b5da` -- docs(plan): ui04 04c2 job-card color refinement planning sync (Tier 2 capture baseline tai STEP-01 ngay truoc khi sua).
- Tier 0 directive `docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md` (10/09/2026) cho phep 04c1 + 04c2 commit/push production (thay the lenh cu "Tier 2 KHONG push").
- Tier 2 KHONG push len origin/main (Tier 1 push cuoi round Phase 1 + Phase 2).
- Source production `app/components/GlobalFooter.tsx` + `app/components/ContactForm.tsx` con o baseline `04b767e` (composition/footer ACCEPTED). Tier 2 khong revert.
- 8 file dirty R3 (`8c6fd03`) da commit path-scoped; Tier 2 khong revert.

## 2. Tier 2 chi duoc cham 2 file

```
app/components/GlobalFooter.tsx
app/components/ContactForm.tsx
```

Moi file khac thuoc §0 Forbidden paths trong TASK.md. Tier 2 KHONG mo `app/globals.css`, KHONG them package, KHONG them icon library moi.

## 3. Viec Tier 2 phai lam (theo STEP ID trong TASK.md)

### Buoc 1 -- Capture baseline (STEP-01)

Da co file skeleton `evidence/exec-head-before.txt` + `evidence/working-tree-before.txt`. Tier 2 chi can xac nhan noi dung khoi tao cua Tier 1 (HEAD = `0e0320b...`) bang `git rev-parse HEAD` ngay truoc STEP-02 va cap nhat neu can.

```powershell
# Baseline confirmations (Tier 2 chi doc, khong sua)
git rev-parse HEAD
git status --short
Get-Content docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/exec-head-before.txt
Get-Content docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/working-tree-before.txt
```

Tier 2 cap nhat `evidence/exec-head-before.txt` neu shell ghi thay doi (Tier 1 ghi `0e0320b...` luc 22:40; Tier 2 nen ghi nhan lai thoi diem ghi cua Tier 2 de truy vet). Neu Tier 2 ghi khac Tier 1 -- chen them `## Tier 2 capture` o duoi.

### Buoc 2 -- Skeleton invariant guard (STEP-02)

Tier 2 doc:
- `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md` (16 lua chon Owner)
- TASK.md §1.1 (nguyen tac giu) + §1.2 (non-goals) + §0 Forbidden paths + §4 RQ-00

Tier 2 ghi nhan trong HANDOFF.md §1 Outcome rang da doc skeleton invariant va 16 Owner decisions.

### Buoc 3 -- Baseline source da doc (Tier 1 da review source)

Tier 1 da doc `app/components/GlobalFooter.tsx` + `ContactForm.tsx` luc 22:55:

- Footer bg: `bg-primary-fixed/20` -> RQ-01 yeu cau `/35`.
- Heading labels hien tai: `Công ty` / `Dịch vụ` / `Thông tin liên hệ` -> RQ-15 doi.
- Copyright: `© {year} HRP — Hệ sinh thái nhân sự toàn diện.` -> RQ-09 doi.
- 3 link disabled dung `<button type="button" aria-disabled="true" tabIndex={-1}>` -> RQ-11 doi sang `<span aria-disabled>`.
- Helper text ContactForm: `Tính năng đang được hoàn thiện...` -> RQ-07 doi.
- 5 dich vu SU DUNG `material-symbols-outlined` "circle" -> RQ-03 (DEC-10) doi sang Lucide icon phu hop (Tier 2 xac minh Lucide da co trong project truoc khi them import; KHONG them package moi).
- Panel lien he hien khong co -> RQ-14 them `<div className="rounded-2xl bg-primary-container/40 p-4">` wrap `<ContactForm .../>`. Token `primary-container/40` da dung o components khac; Tier 2 xac minh = `rg "primary-container" app/` truoc.

Tier 2 lay baseline source o commit `04b767e` (ACCEPTED); neu Tier 2 da co HEAD = `0e0320b` thi footer source van giong `04b767e` (2 commit planning khong sua source).

### Buoc 4 -- Thi cong layout + panel (STEP-03)

Anh xa RQ -> diff cu the:

- **RQ-01** (peach dam hon): doi `<footer ... className="border-t border-line bg-primary-fixed/20">` thanh `bg-primary-fixed/35`. Verify token `/35` resolve duoc = `rg -n "primary-fixed/35" app/` (neu khong co, Tier 2 dung `bg-primary-fixed/30` da co o ReferralStrip, hoac escalate Tier 1).
- **RQ-02** (3 cot giu): giu `md:grid-cols-3`; neu Tier 2 muon chinh ty le de form khong chat, dung `md:grid-cols-[1.1fr_1fr_1.1fr]` hoac tuong duong. KHONG doi thu tu.
- **RQ-13** (container 1080px): giu `mx-auto w-full max-w-[1080px] px-4 md:px-6`.
- **RQ-14** (panel lien he cam am): wrap `<ContactForm .../>` trong `<div className="rounded-2xl bg-primary-container/40 p-4 md:p-5">` (hoac tuong duong).
- **RQ-15** (heading labels): thay heading cu `Công ty` / `Dịch vụ` / `Thông tin liên hệ` bang `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ`.

### Buoc 5 -- Content giu + dich vu chinh typography/icon (STEP-04)

- **RQ-03** (5 dich vu): giu nguyen chuoi, thay `material-symbols-outlined` icon `circle` bang Lucide icon phu hop (DEC-10). Icon de xuat: `Briefcase`, `Cpu`, `Users`, `PackageOpen`, `Package` (Tier 2 chon icon semantic phu hop).
- **RQ-04** (tel/mailto/website): giu nguyen chuoi; chi chinh typography/icon/spacing neu can.
- **RQ-05** (dia chi Phu Tho): giu nguyen chuoi.
- **RQ-10** (routes that): giu `Về chúng tôi` -> `/ve-chung-toi` va `Cộng tác viên` -> `/ctv-portal`.

### Buoc 6 -- Copyright + semantic disabled (STEP-05)

- **RQ-09** (copyright): thay `© {year} HRP — Hệ sinh thái nhân sự toàn diện.` bang `© {year} HRP Việt Nam. Connecting for Success.`. Giu `new Date().getFullYear()` runtime.
- **RQ-11** (semantic disabled): 3 link `Điều khoản` / `Chính sách bảo mật` / `Liên hệ` (hien dang la `<button aria-disabled="true" tabIndex={-1}>` qua `FooterLinkItem`), Tier 2 thay thanh `<span aria-disabled="true" tabIndex={-1} className="...text-on-surface-variant opacity-70">`. KHONG dung `<button>`; KHONG `href="#"`; KHONG tao route moi. Tier 2 co the refactor `FooterLinkItem` thanh 2 component (`FooterRouteLink` + `FooterDisabledText`) hoac giu 1 component voi prop `type: 'route' | 'disabled'` -- chon cach nao gon.
- **RQ-00** (invariant): KHONG phuc hoi "Phiên bản 6.0".

### Buoc 7 -- Mobile responsive + touch target (STEP-06)

- **RQ-12** (touch target >= 44px): them `min-h-11` (~44px) hoac `min-h-[44px]` cho tat ca `<a>` (2 hotline, 1 email, 1 website), `<Link>` (2 route), va CTA `<button type="submit">`. Verify = `rg -n "min-h-\\[44px\\]|min-h-11" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` expect >=5 match.

### Buoc 8 -- ContactForm helper text + CTA + input white (STEP-07)

- **RQ-06** (form disabled giu): giu `<fieldset disabled={disabled}>` voi moi `disabled={disabled}` tren input/textarea/button. KHONG them validation moi; KHONG goi API.
- **RQ-07** (helper text moi): thay `Tính năng đang được hoàn thiện. Vui lòng gọi hotline hoặc email.` bang `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.` Helper text chi hien khi `disabled === true`.
- **RQ-08** (CTA giu): giu chuoi `GỬI NGAY`; button thuoc `<fieldset disabled>`; giu `disabled:opacity-50`.
- **RQ-16** (input nen trang + accessible name): giu `bg-white` cho input/textarea; giu `<label htmlFor="contact-...">` + `id="contact-..."` cho a11y.

### Buoc 9 -- Reachability & hedge (STEP-08)

- Verify: 0 match `<button` trong `app/components/GlobalFooter.tsx` (`rg -n "<button" app/components/GlobalFooter.tsx`).
- Verify: `target="_blank"` co `rel="noopener noreferrer"` (da co o baseline).
- Verify: heading semantic `<h3>` da co san.
- Tier 2 KHONG them package icon moi.

### Buoc 10 -- Regression check + gates (STEP-99)

```powershell
# 1. Source review
git diff --name-only exec-head-before..HEAD | Should -BeIn allowlist: 'app/components/GlobalFooter.tsx','app/components/ContactForm.tsx','docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/**'

# 2. R3 8 file dirty khong doi (file trong 8c6fd03 da commit, khong con dirty)
git status --porcelain  # expect: khong co file ngoai allowlist

# 3. Mandatory gates
npm run typecheck                                                       # exit 0
npm run test:unit                                                       # same expected failure set + new failure count = 0
npm run build                                                           # exit 0
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md -HandoffPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/HANDOFF.md

# 4. AC files evidence
# Tier 2 chay tung AC verification command (rg / Select-String) theo §6.1 TASK.md va luu evidence:
# ac00-invariants.txt, ac01-background.txt, ac02-grid.txt, ac03-services.txt,
# ac04-links-address.txt, ac05-contactform-disabled.txt, ac06-helper-text.txt,
# ac07-copyright.txt, ac08-routes-disabled-semantic.txt, ac09-touch-target.txt,
# ac10-container.txt, ac11-panel.txt, ac12-headings.txt, ac13-input-white.txt
```

Tier 2 neu co pre-existing test failures (giong R3: 13 tests tren 5 file) ghi BLK-01 trong HANDOFF.md §4 voi baseline hash + delta count = 0.

### Buoc 11 -- Capture evidence gates

```powershell
npm run typecheck > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/typecheck.txt 2>&1
npm run test:unit --reporter=basic > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/test-unit.txt 2>&1
npm run build > docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/build.txt 2>&1
```

## 4. Cap nhat HANDOFF.md theo compact canonical

HANDOFF.md hien dang o skeleton `READY_FOR_REVIEW`. Tier 2 cap nhat:

### Section 0 -- Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04c1-footer-tweak-r2` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Execution round | `1` |
| Baseline | `<SHA tu exec-head-before.txt -- ky vong 0e0320b...>` |
| Status | `READY_FOR_REVIEW` (FAST lane khong can Tier 3 audit; Owner live visual review) |

### Section 1 -- Outcome and changed surface

- **Delivered:** bullet ngan (<= 10) tung RQ/STEP da lam.
- **Not delivered:** `<None>`
- **Changed:** 2 file allowlist (`GlobalFooter.tsx` + `ContactForm.tsx`).
- **Lane escalation:** `<No>`

### Section 2 -- Acceptance evidence

Dong dau: `verify-task.ps1 PASS`. Moi `AC-01..AC-14` co row rieng; cot Evidence cite `E-xx`; cot Result do duoc; cot Limitation `None`. Bang 4 cot.

### Section 3 -- Evidence registry

Bang 4 cot: `Evidence | Command / method | Exit / measured result | Artifact`. Moi `E-xx` map toi file `evidence/acXX-*.txt`.

### Section 4 -- Deviations and blockers

Neu co pre-existing test failures: ghi `BLK-01` voi description day du + baseline hash. Neu khong co: `<None>`.

### Section 5 -- Final status

Mot cau ket luan + `> Handoff status: READY_FOR_REVIEW` (FAST).

## 5. Commit path-scoped (Tier 2 lam sau khi HANDOFF ok)

Tier 2 commit path-scoped chi 1 commit (Tier 0 cho phep commit, Tier 1 se commit final):

```powershell
# Kiem tra allowlist truoc commit
git status --short
# Cho phep: M app/components/GlobalFooter.tsx, M app/components/ContactForm.tsx,
#           A docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/HANDOFF.md,
#           A/?? docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/** (cac file moi)

# Commit path-scoped
git add app/components/GlobalFooter.tsx app/components/ContactForm.tsx docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/HANDOFF.md docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/
git commit -m "feat(ui): hrp-v6-ui-04c1-footer-tweak-r2 fast round 1 -- apply 16 Owner decisions"
```

Tier 2 KHONG push origin/main. Tier 1 push production sau ca Phase 1 + Phase 2.

## 6. Dieu KHONG duoc lam

- KHONG sua `TASK.md` them. Tier 1 owns TASK.md; Tier 2 chi fill HANDOFF + evidence.
- KHONG revert source: 8 file R3 dirty trong `8c6fd03` da commit; composition/footer `04b767e` da ACCEPTED.
- KHONG mo `app/globals.css`, khong them package, khong them icon library moi.
- KHONG tao route moi (Owner #13).
- KHONG tao `<button>` gia cho 3 link disabled (Owner #14).
- KHONG dung `href="#"` (Owner #14).
- KHONG phuc hoi "Phiên bản 6.0".
- KHONG hardcode mau hex -- chi dung semantic token hien co.
- KHONG stage untracked ngoai task (`docs/AI_PROJECT_BRIEF.md`, `docs/TIER0_HANDOVER.md`, `docs/V6/CRM_CSKH_INTEGRATION_PLAN.md`, `docs/V6/hrp-crm-target-architecture.*`, `docs/prompts/**`, `docs/reports/**`, `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/tier0-review-ui04c-contracts-v*.md`, `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/tier1-report-roadmap-cursor-conflict.md`, `docs/tasks/hrp-v6-ui-04b-pagination-admin/evidence/owner-live-visual-review-r1.md`, `docs/tasks/hrp-v6-ui-04c-home-composition-footer/evidence/`, `docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/` -- tru cac file Tier 2 tao ra trong Phase 1).
- KHONG push origin/main (Tier 1 push o cuoi round).
- KHONG cai tool do (axe-core, Lighthouse, CDP, pa11y).
- KHONG tu phat hanh ACCEPTED verdict. Owner live visual review (AC-14) thuoc Owner sau deploy.

## 7. Khi gate PASS

Tier 2 bao lai Tier 1 voi:
- Output cuoi cung `verify-task.ps1` (ky vong `RESULT: PASS`).
- Output cuoi cung `verify-handoff.ps1` (ky vong `RESULT: PASS` hoac `PASS WITH WARNINGS`).
- So file da stage o `evidence/` (ky vong >= 14 file: 3 baseline + typecheck + test-unit + build + 11 ac files; tuy thuoc AC nao Tier 2 capture).
- Tom tat 1 cau: HANDOFF da chuyen sang compact canonical, 14 AC deu co evidence row, baseline pre-existing da doi chieu.
- Commit hash local (Tier 2 commit path-scoped o Phase 1).

Tier 1 review FAST, resolve finding neu co, sau do COMMIT cuoi + push production. Ca Phase 1 + Phase 2 ACCEPTED -> push HEAD len origin/main 1 lan.
