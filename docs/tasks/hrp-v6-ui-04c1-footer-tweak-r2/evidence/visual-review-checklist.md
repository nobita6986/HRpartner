# Visual Review Checklist — UI04 Round Phase 1+2 (post-deploy)

> **Dành cho Owner live visual review.** Em không truy cập Vercel dashboard được; anh vui lòng tự verify tại:
> - **Production preview URL:** https://hrpartner-k2958oa8l-thuans-projects-0b7f4d74.vercel.app
> - **Deployment ID:** Vercel #6376933011 (success 17:02:13 UTC, 10/09/2026)
> - **Source commit:** `918e2ee` (push 17:00:31 UTC, 10/09/2026)

---

## 1. Build & runtime health

| Hạng mục | Kỳ vọng | Source commit |
|---|---|---|
| Build runtime error | Không có | 918e2ee |
| 404 page assets | Không có | 918e2ee |
| Hydration warning console | Không có | 918e2ee |
| Lighthouse mobile (nếu check được) | ≥ 80 | target tương đương R3 |

> Tier 1 đã verify `pnpm typecheck` + `pnpm test:unit` + `pnpm build` PASS tại HEAD `780bb75` trước push. Không có warning mới.

---

## 2. 04c1 — Footer (3 cột) + ContactForm panel

**Source:** `app/components/GlobalFooter.tsx` + `app/components/ContactForm.tsx` (commit `9f593fa`).

### 2.1 Footer 3 cột

| AC | Check | Pass? |
|---|---|---|
| AC-00: Layout 3 cột desktop (≥ md breakpoint) | Cột 1 logo+tagline, cột 2 navigation, cột 3 contact | ☐ |
| AC-01: Mobile 1 cột stack | Footer wrap vertical dưới sm | ☐ |
| AC-02: Container 1080px max-width | Không tràn gutter | ☐ |
| AC-03: Spacing đều 24/32 (px-6 / py-12) | Visual rhythm đồng đều | ☐ |
| AC-04: Color tokens (không hardcode hex) | text-muted-foreground, border-border, bg-card | ☐ |
| AC-05: Typography hierarchy | Logo > Nav heading > body | ☐ |
| AC-06: ReferralStrip invariant giữ nguyên (composition-footer 04b767e) | Không bị vỡ | ☐ |

### 2.2 ContactForm panel

| AC | Check | Pass? |
|---|---|---|
| AC-07: Form mở tại section footer khi click trigger | Smooth scroll/focus vào input đầu | ☐ |
| AC-08: 4 fields (name/email/phone/message) | Đủ input, label rõ | ☐ |
| AC-09: Validation client-side | Email format, required field highlight | ☐ |
| AC-10: Submit button state (idle/loading/disabled) | Không double-submit | ☐ |
| AC-11: A11y (label-for, aria-invalid, aria-describedby) | Tab order hợp lý, screen reader OK | ☐ |
| AC-12: Success/error message | Hiển thị inline | ☐ |
| AC-13: Responsive (mobile stack, desktop 2-col) | Không vỡ viewport | ☐ |
| AC-14: Không mở API endpoint mới | Không có network call tới /api/contact (chỉ UI, không persistence) | ☐ |

### 2.3 Visual regression so với R3 (commit `8c6fd03`)

- Footer phải giữ nguyên **khung 3 cột** trước đó — chỉ thay content/link/CTA theo 16 Owner decisions.
- Section nav trong footer: link không trỏ 404.
- ContactForm không đè ReferralStrip.

---

## 3. 04c2 — Job Card landing section

**Source:** `src/domains/job-board/components/landing/featured-job-card.tsx` + `featured-job-card.test.ts` (commit `1316ff4`).

### 3.1 Visual properties (16 Owner decisions + 5 interaction invariants)

| AC | Check | Pass? |
|---|---|---|
| AC-00: Title size (text-lg hoặc text-xl tuỳ responsive) | Đậm, không quá to, không tràn | ☐ |
| AC-01: Company name muted (text-muted-foreground) | Subdued so với title | ☐ |
| AC-02: Salary saturation (text-emerald-600/700 hoặc tuỳ Owner decision) | Nổi bật nhưng không chói | ☐ |
| AC-03: Location pin icon (lucide-react MapPin) | Render đúng, không lệch baseline | ☐ |
| AC-04: Job type badge (Full-time/Part-time) | Pill style Tailwind, màu muted | ☐ |
| AC-05: Urgent badge nếu có | Đỏ/cam muted, không thô | ☐ |
| AC-06: CTA color (Owner decision: primary hoặc secondary CTA, không 2 màu chói) | Đúng tone | ☐ |
| AC-07: Card shadow/border (border-border hoặc shadow-sm) | Subtle, không nặng | ☐ |
| AC-08: Hover state (scale, shadow, hoặc tuỳ Owner decision) | Mượt, không flicker | ☐ |
| AC-09: Spacing card (p-4/p-5, gap-4) | Rhythm đều grid | ☐ |
| AC-10: Grid layout (mobile 1 col, tablet 2 col, desktop 3 col) | Đúng breakpoint | ☐ |
| AC-11: Empty state (không có job nào urgent) | Hiển thị fallback message | ☐ |
| AC-12: 89/89 tests pass | Không có console error | ☐ |
| AC-13: Không hardcode hex | Chỉ Tailwind utility | ☐ |
| AC-14: Không thêm package icon | Chỉ dùng lucide-react đã có | ☐ |

### 3.2 5 Interaction invariants

1. **Hover không trigger navigation** (click vào card mới navigate).
2. **CTA click stop propagation** (không bubble lên card click handler).
3. **Focus visible** trên CTA + card (a11y keyboard nav).
4. **Reduced motion respected** (`prefers-reduced-motion` tắt scale/animation).
5. **Salary hiển thị consistent** giữa card và detail page (cùng format number).

### 3.3 Visual regression so với R3 (commit `8c6fd03`)

- Card layout grid không bị vỡ.
- Featured section vẫn có 6 cards desktop / 3 mobile.
- Live urgent jobs (nếu có) vẫn render đúng priority.

---

## 4. Cross-cutting checks

| Check | Note |
|---|---|
| Lighthouse mobile perf (nếu Owner muốn) | Mục tiêu ≥ 80 |
| A11y cơ bản (tab order, contrast) | Có thể check thủ công |
| Console errors/warnings | Không có |
| Network 404 | Không có |
| Type safety runtime | Pass (build OK) |

---

## 5. Quy trình review

1. **Anh duyệt từng AC ở §2 + §3**, tick ✅ hoặc ghi chú "Cần chỉnh: …".
2. **Nếu tất cả ✅**: 
   - Tier 1 → `ACCEPTED final` 04c1 + 04c2 round 1
   - Closeout UI04 round Phase 1+2
   - Mở task `hrp-v6-ui-04d-section-render` (vẫn BLOCKED v1.5)
3. **Nếu có điểm cần chỉnh**:
   - Tier 1 mở task `hrp-v6-ui-04c3-job-card-visual-refinement-r2` (Job Card) hoặc `hrp-v6-ui-04c1-r3-footer-tweak` (Footer)
   - Tier 1 không tự fix visual khi chưa có Owner decision mới

---

## 6. Known limitations (Tier 1 báo trước)

- **CI #146 FAIL** (`Prisma schema validate`) — pre-existing từ commit `8c6fd03`, không liên quan UI04. Tier 1 đã mở task `fix-ci-prisma-validate` (DRAFT v0.1) để Tier 0 quyết làm hay defer.
- **docs/V7 residue** (17 file tracked) — planning backlog chưa active. Tier 1 không tự archive; để Tier 0 quyết.
- **Production alias domain** — hiện chỉ có preview URL; Tier 0 confirm production alias nếu cần.

---

*Tạo bởi Tier 1 ngày 11/09/2026 00:15 Asia/Bangkok tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/visual-review-checklist.md` (mirror tại 04c2 evidence).*
