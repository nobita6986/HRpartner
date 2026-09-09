# HANDOFF — `hrp-v6-ui-03-homepage-huongb-visual-parity`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-03-homepage-huongb-visual-parity` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` (correction round 1 — chưa chạy Tier 2; task này đã qua correction round 1 theo Owner verdict 09/09 21:28 ICT) |
| Baseline | `eda2602` |
| Status | `BLOCKED` |

## 1. Outcome and changed surface

- **Delivered:** TASK.md v1.1 — contract đầy đủ cho 7 section theo code.html, 13 RQ, 12 STEP, 10 AC. Đã sửa theo Owner verdict 09/09 21:28 ICT (10 điểm): DEC-04 chốt (b) có ràng buộc → section 5 = `Dự án đang tuyển`; bỏ whole-page pixel mismatch ≤ 5% → section-level bbox tolerance ±4 px + mask; axe-core → Lighthouse/pa11y/grep rule; Navbar với link `aria-disabled="true"`; ghi rõ pixel logo 64×64, location 192 px; AC-09 đo baseline mới tại `eda2602`; AC-10 có command verify rõ; homepage search UI chỉ 3 control (keyword/city/salary).
- **Not delivered:** Thi công Tier 2, visual capture, gates, audit — chưa bắt đầu (Execution round = 0).
- **Changed:** N/A — đang ở giai đoạn hợp đồng sau correction round 1.
- **Lane escalation:** No.

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| -- | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | None |
| AC-01 | `npx playwright test --project=chromium section-order.spec.ts` | `pending — Tier 2` | None |
| AC-02 | `npx playwright test --project=chromium section-bbox.spec.ts` (Playwright lấy `getBoundingClientRect()` từng section ở cả actual + reference, mask vùng data; expect mỗi section chênh ≤ 4 px) | `pending — Tier 2` | None |
| AC-03 | `curl -fs http://localhost:3000/api/jobs?keyword=test&area=bac-ninh`; `rg "shift" src/domains/job-board/components/landing/hero.tsx` (expect 0 match) | `pending — Tier 2` | None |
| AC-04 | `npx playwright test --project=chromium mobile-overflow.spec.ts` (CDP Runtime.evaluate; expect `window.innerWidth === document.documentElement.scrollWidth`) | `pending — Tier 2` | None |
| AC-05 | `rg -n "lh3\.googleusercontent\|companyName" src/ app/ docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/evidence/ac05-scope-diff.txt` (expect 0 match ngoài allowlist) | `pending — Tier 2` | None |
| AC-06 | `rg -n "17\.800\|13\.000\.000\|\+10\.000\.000\|\+50\.000\.000\|10\.000\.000 VNĐ\|50\.000\.000 VNĐ" src/domains/job-board/components/landing/ "app/(portal)/page.tsx"` (expect 0 match) | `pending — Tier 2` | None |
| AC-07 | `npx playwright test --project=chromium recruiting-section.spec.ts` (Playwright DOM check section 5: đếm card, kiểm KHÔNG có text "Top công ty" / "Đối tác chính thức", kiểm img alt không chứa tên công ty) | `pending — Tier 2` | None |
| AC-08 | E-07 | `pending — Tier 2` | None |
| AC-09 | `npm run typecheck` (expect exit 0); `npm run test:unit -- public-card-truth` (expect exit 0); `git checkout eda2602 && npm run test:unit` (baseline measure tại eda2602); `npm run test:unit` (expect exit 1 + 0 new failure); `npm run build` (expect exit 0); `verify-handoff.ps1` (expect RESULT: PASS) | `pending — Tier 2` | None |
| AC-10 | `npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json --quiet` (nếu Lighthouse có sẵn); HOẶC `rg "(a\|button\|input)[^>]*\s(class\|className)=[^>]*focus:" src/domains/job-board/components/landing/ src/domains/job-board/components/hr-monogram.tsx app/components/Global*.tsx` (expect ≥ 1 match per interactive type) | `pending — Tier 2` | None |

## 3. Evidence registry

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-03-homepage-huongb-visual-parity/TASK.md` | `RESULT: PASS` | `evidence/verify-task.txt` |
| `E-02` | Playwright section-bbox compare (AC-02) | mỗi section chênh ≤ 4 px sau mask | `evidence/ac02-section-bbox.txt` + `evidence/screenshots/section-bbox-*.png` |
| `E-03` | Playwright mobile-overflow CDP (AC-04) | `scrollWidth === innerWidth` | `evidence/ac04-cdp-measure.txt` |
| `E-04` | `rg` scope diff (AC-05) | 0 match ngoài allowlist | `evidence/ac05-scope-diff.txt` |
| `E-05` | `rg` truth fence (AC-06) | 0 match | `evidence/ac06-truth-fence.txt` |
| `E-06` | Playwright recruiting section check (AC-07) | KHÔNG có "Top công ty" / "Đối tác chính thức"; ẩn nếu rỗng | `evidence/ac07-recruiting-check.txt` |
| `E-07` | `node scripts/section-screenshots-count.mjs` (AC-08) — script dùng Playwright chụp 7 section × 2 viewport + 4 main PNG; expect ≥ 18 file PNG | ≥ 18 file hợp lệ PNG | `evidence/ac08-screenshots.txt` |
| `E-08` | Gates: typecheck, public-card-truth, unit test baseline tại eda2602, build, verify-handoff (AC-09) | tất cả PASS theo baseline đo mới | `evidence/ac09-{typecheck,build,unit-test-baseline,unit-test,verify-handoff}.txt` |
| `E-09` | Lighthouse accessibility hoặc grep focus rule (AC-10) | score ≥ 90 hoặc ≥ 1 match per interactive type | `evidence/ac10-lighthouse.json` hoặc `evidence/ac10-focus-rule.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `BLK-01` | BLOCKER | **Owner verdict v1.0 → REVISION_REQUIRED** (09/09 21:28 ICT): Owner đã chốt DEC-04 (b) có ràng buộc tại `evidence/owner-dec-04.md`, và Tier 1 đã sửa 10 điểm trong TASK.md v1.1. Tuy nhiên chưa có PASS verdict mới từ Owner sau khi xem v1.1 — chờ Owner xác nhận contract v1.1 đủ điều kiện chuyển `READY_FOR_EXECUTION`. | Owner xem lại TASK.md v1.1 + HANDOFF.md v1.1 và ký PASS (hoặc REVISION_REQUIRED lần 2). Nếu PASS → Tier 1 đổi status `BLOCKED → READY_FOR_EXECUTION`, giao Tier 2. Nếu REVISION_REQUIRED → mở correction round tiếp. |

## 5. Final status

**BLOCKED on BLK-01** — Owner chưa duyệt TASK v1.1 sau correction round 1. `verify-task.ps1` RESULT: PASS (TASK contract v1.1 hợp lệ), nhưng không giao Tier 2 cho đến khi Owner ký PASS. Sau khi Owner PASS, Tier 1 đổi Status → `READY_FOR_EXECUTION` (Owner verdict §8 yêu cầu).

> Handoff status: BLOCKED
