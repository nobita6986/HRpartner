# HANDOFF — `hrp-v6-ui-04c1-footer-tweak-r2`

> Tier 2 implementation handoff. Tier 1 review + commit final + push.

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04c1-footer-tweak-r2` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Execution round | `1` |
| Baseline | `0e0320b3053294a8425fb08bba371382ce77b5da` |
| Status | `READY_FOR_REVIEW` |

**[Tier 2 confirm]**: đã đọc SK invariant guard (TASK §4 RQ-00) + 16 Owner decisions (evidence/owner-footer-r2-decisions.md).

## 1. Outcome Summary

### Delivered (RQ-01..RQ-16)

- **RQ-01**: footer bg `bg-primary-fixed/20` → `bg-primary-fixed/35` (peach đậm hơn 1 bậc).
- **RQ-02**: 3 cột desktop giữ thứ tự `Công ty → Dịch vụ → Liên hệ`, tỷ lệ `md:grid-cols-[1.1fr_1fr_1.1fr]`.
- **RQ-03**: 5 dịch vụ giữ nội dung, `material-symbols-outlined circle` → Lucide (`Briefcase`, `Cpu`, `Users`, `PackageOpen`, `Package`).
- **RQ-04 + RQ-05**: hotline/email/website/địa chỉ Phú Thọ giữ nguyên chuỗi.
- **RQ-06 + RQ-08**: ContactForm `disabled={true}` + CTA `GỬI NGAY` giữ.
- **RQ-07**: helper text đổi sang `Vui lòng liên hệ qua hotline hoặc email trong thời gian này.`; chuỗi cũ `Tính năng đang được hoàn thiện` đã bỏ.
- **RQ-09**: copyright đổi sang `© {year} HRP Việt Nam. Connecting for Success.`; không `Phiên bản 6.0`.
- **RQ-10 + RQ-11**: routes `/ve-chung-toi` + `/ctv-portal` giữ; 3 link disabled đổi từ `<button aria-disabled>` → `<span aria-disabled>` (semantic).
- **RQ-12**: touch target 44px: `min-h-11` trên 2 tel:, 1 mailto:, 1 website, 2 route Link, 1 CTA (7 match).
- **RQ-13**: container `max-w-[1080px] mx-auto px-4 md:px-6` giữ.
- **RQ-14**: panel liên hệ cam ấm wrap ContactForm: `rounded-2xl bg-primary-container/40 p-4 md:p-5`.
- **RQ-15**: heading labels đổi: `CÔNG TY TNHH HRP VIỆT NAM` / `DANH MỤC DỊCH VỤ` / `THÔNG TIN LIÊN HỆ`.
- **RQ-16**: ContactForm input/textarea giữ `bg-white`; accessible name qua `htmlFor` + `id`.

### Not delivered

`<None>`

### Changed deliverables

- `app/components/GlobalFooter.tsx`
- `app/components/ContactForm.tsx`

### Lane escalation

`<No>`

## 2. Execution Trace

| Step | Action | Result |
|---|---|---|
| `STEP-01` | Baseline capture: `git rev-parse HEAD` → `exec-head-before.txt`; `npm run test:unit` → `expected-failure-set-before.txt` | HEAD `0e0320b...`, 12 pre-existing failures on 5 files |
| `STEP-02` | Read RQ-00 invariant + 16 Owner decisions + §0 Forbidden | Confirmed — proceed |
| `STEP-03` | Apply RQ-01 (bg /35), RQ-02 (grid ratio), RQ-13 (container), RQ-14 (panel), RQ-15 (headings) to GlobalFooter.tsx | PASS — rg verified |
| `STEP-04` | Apply RQ-03 (Lucide icons), RQ-04 (links), RQ-05 (address), RQ-10 (routes) to GlobalFooter.tsx | PASS — rg verified |
| `STEP-05` | Apply RQ-09 (copyright), RQ-11 (semantic disabled spans) to GlobalFooter.tsx | PASS — 0 button, 0 "Phiên bản 6.0" |
| `STEP-06` | Apply RQ-12 (min-h-11 touch targets) to GlobalFooter.tsx + ContactForm.tsx | PASS — 7 match |
| `STEP-07` | Apply RQ-06 (form disabled), RQ-07 (helper text), RQ-08 (CTA), RQ-16 (bg-white inputs) to ContactForm.tsx | PASS — rg verified |
| `STEP-08` | Reachability: 0 `<button` in GlobalFooter, `noopener noreferrer` present | PASS |
| `STEP-99` | Gates: typecheck exit 0, test:unit 12 failures (unchanged), build exit 0 | PASS |

## 3. Acceptance Evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | verify-task.ps1 | RESULT: PASS | |
| `AC-00` | `E-01` | PASS | `None` |
| `AC-01` | `E-02` | PASS | `None` |
| `AC-02` | `E-03` | PASS | `None` |
| `AC-03` | `E-04` | PASS | `None` |
| `AC-04` | `E-05` | PASS | `None` |
| `AC-05` | `E-06` | PASS | `None` |
| `AC-06` | `E-07` | PASS | `None` |
| `AC-07` | `E-08` | PASS | `None` |
| `AC-08` | `E-09` | PASS | `None` |
| `AC-09` | `E-10` | PASS | `None` |
| `AC-10` | `E-11` | PASS | `None` |
| `AC-11` | `E-12` | PASS | `None` |
| `AC-12` | `E-13` | PASS | `None` |
| `AC-13` | `E-14` | PASS | `None` |
| `AC-14` | Owner live visual review post-deploy — E-18 (pending after deploy) | `CHOSEN` | Visual gate thuộc Owner sau deploy |

## 4. Changed Deliverables

| File | Delta | RQ covered |
|---|---|---|
| `app/components/GlobalFooter.tsx` | bg /35, grid ratio, panel /40, headings, Lucide icons, semantic spans, min-h-11, copyright new | RQ-01..05, RQ-09..15 |
| `app/components/ContactForm.tsx` | helper text new, CTA unchanged, min-h-11, bg-white inputs | RQ-06..08, RQ-16 |

## 5. Deviations

**Pre-existing test failures** (baseline captured at STEP-01):
- 12 pre-existing failures on 5 files — unchanged from `expected-failure-set-before.txt`.
- `BLK-01`: N/A (delta count = 0 — no new failures introduced).

`<None>` — không có deviation mới.

## 6. Evidence Index

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `rg -n "Phiên bản 6\.0" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` | 0 match | `ac00-invariants.txt` |
| `E-02` | `rg -n "bg-primary-fixed/35" app/components/GlobalFooter.tsx` | 1 match | `ac01-background.txt` |
| `E-03` | `Select-String -Path app/components/GlobalFooter.tsx -Pattern "md:grid-cols-\[1\.1fr_1fr_1\.1fr\]"` | 1 match | `ac02-grid.txt` |
| `E-04` | `rg -n "Cung ứng.*lao động|Dịch vụ gia công|Dịch vụ giới thiệu|Briefcase|Cpu|Users|PackageOpen|Package" app/components/GlobalFooter.tsx` | 10 match (5 dịch vụ + 5 icon) | `ac03-services.txt` |
| `E-05` | `rg -n "tel:02112216999|tel:0964984866|mailto:nhaluchrp@gmail\.com|target=\"_blank\" rel=\"noopener noreferrer\"|Thuê Khu đất DV Tân Ngọc" app/components/GlobalFooter.tsx` | 5 match | `ac04-links-address.txt` |
| `E-06` | `rg -n "fieldset disabled|GỬI NGAY|disabled=\{disabled\}|type=\"submit\"|disabled:opacity-50" app/components/ContactForm.tsx` | 5 match | `ac05-contactform-disabled.txt` |
| `E-07` | `rg -n "Vui lòng liên hệ qua hotline hoặc email trong thời gian này" app/components/ContactForm.tsx` | 1 match; old text 0 match | `ac06-helper-text.txt` |
| `E-08` | `rg -n "Connecting for Success|HRP Việt Nam|new Date\(\)\.getFullYear|Phiên bản 6\.0" app/components/GlobalFooter.tsx` | 3 match (new), 0 match (old) | `ac07-copyright.txt` |
| `E-09` | `rg -n "/ve-chung-toi|/ctv-portal|aria-disabled=\"true\"|<button|href=\"#\"" app/components/GlobalFooter.tsx` | 2 route + 3 disabled + 0 button + 0 href="#" | `ac08-routes-disabled-semantic.txt` |
| `E-10` | `rg -n "min-h-\[44px\]|min-h-11" app/components/GlobalFooter.tsx app/components/ContactForm.tsx` | 7 match | `ac09-touch-target.txt` |
| `E-11` | `rg -n "max-w-\[1080px\]|px-4 md:px-6" app/components/GlobalFooter.tsx` | 4 match | `ac10-container.txt` |
| `E-12` | `rg -n "primary-container/40|rounded-2xl|p-4 md:p-5" app/components/GlobalFooter.tsx` | 3 match | `ac11-panel.txt` |
| `E-13` | `rg -n "CÔNG TY TNHH HRP VIỆT NAM|DANH MỤC DỊCH VỤ|THÔNG TIN LIÊN HỆ|<h3" app/components/GlobalFooter.tsx` | 4 match | `ac12-headings.txt` |
| `E-14` | `rg -n "bg-white|htmlFor=\"contact-|id=\"contact-" app/components/ContactForm.tsx` | 9 match (3 bg-white + 3 htmlFor + 3 id) | `ac13-input-white.txt` |
| `E-15` | `npm run typecheck` | exit 0 | `typecheck.txt` |
| `E-16` | `npm run test:unit` | 12 pre-existing failures (unchanged), 0 new | `test-unit.txt` |
| `E-17` | `npm run build` | exit 0 | `build.txt` |
| `E-18` | `verify-task.ps1` | PASS | `ac-gates.txt` |
| `E-19` | `verify-handoff.ps1` | PASS | `ac-gates.txt` |

## 7. Execution Round History

| Round | Executor | Result | Notes |
|---|---|---|---|
| `1` | `Tier 2` | `READY_FOR_REVIEW` | 16 Owner decisions applied (RQ-01..RQ-16); 14 AC PASS; pre-existing failures unchanged (12/5 files) |

Handoff status: READY_FOR_REVIEW
