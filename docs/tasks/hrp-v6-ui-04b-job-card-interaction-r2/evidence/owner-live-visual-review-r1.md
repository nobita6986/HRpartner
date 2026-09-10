# Owner live visual review R1 — Quick Apply CTA

> Date: 2026-09-10  
> Reviewed surface: deployed homepage job cards.  
> Reference evidence supplied by Owner: `codex-clipboard-05e05c36-6e9f-4e0d-bc9e-2af9852083d3.png`, `codex-clipboard-7bab953b-0dc8-4464-ad5a-380c6f028c85.png`.

## Verdict

**FAIL — CORRECTION_REQUIRED before Tier 3 audit.** Interaction behavior is present, but CTA visual treatment is too heavy and hover makes its label disappear. Keep this correction inside `hrp-v6-ui-04b-job-card-interaction-r2`; do not open a new feature task because the current task is only `READY_FOR_AUDIT`, not ACCEPTED.

## Root cause confirmed from current source

1. `.action-area-back` uses `bg-primary-container p-3`, while the nested button uses another filled background. The exposed outer layer creates the thick dark capsule/ring seen by Owner.
2. The active button class combines `hover:bg-primary-container` with `hover:text-primary-container`. Hover therefore sets foreground and background to the same token, which makes both icon and label disappear.

## Required correction

### VIS-04 — One clean CTA surface

- Remove the colored/padded outer capsule from `.action-area-back`; the back face is only a positioning/flip surface.
- Render exactly one visible rounded CTA surface. The button fills the action area height and width.
- No permanent thick border, double background or inset ring. Border is absent or at most 1px using a semantic outline token.
- Use the existing radius family and a restrained shadow. Keep the result visually light and consistent with HuongB.
- Keyboard focus outline remains visible and may be 2px; it must only appear on `:focus-visible`, not look like the resting border.

### VIS-05 — Hover label always remains readable

- Remove `hover:text-primary-container` from the active CTA.
- Rest, hover, focus and active states must keep a valid contrasting foreground/background pair. Prefer the established semantic pair `bg-primary-dark`/`text-on-primary` or `bg-primary-container`/`text-on-primary-container`; hover may use the existing subtle state overlay or shadow without changing text to the background token.
- Icon inherits the same readable foreground as the label.
- Hover/focus must not hide the CTA face, reset it to the back side, or make text transparent.

### VIS-06 — Thu hẹp chiều rộng tổng thể còn khoảng 90%

Owner yêu cầu homepage gọn hơn: lấy mốc container đã chốt trước đây `1200px`, giảm khoảng 10% thành **`1080px`** trên desktop.

- Dùng một mốc thống nhất `max-w-[1080px] mx-auto` cho inner container của navbar, Hero, BestJobs, Areas, Recruiting Projects, các section nội dung mới, ReferralStrip và Footer để các mép dọc thẳng hàng.
- Giữ gutter responsive cân đối: `px-4` trên mobile và khoảng `md:px-6` ở màn hình lớn. Không dùng `width: 90vw` cố định và không dùng `transform: scale(...)` cho cả trang.
- Các grid/card bên trong co theo container. Giảm nhẹ khoảng cách ngang và padding khoảng một spacing step nơi cần thiết để bố cục không chật; giữ hierarchy chữ, logo và icon, không thu nhỏ hàng loạt font bằng scale.
- BestJobs vẫn tối đa 3 cột desktop; card phải đủ chỗ cho tiêu đề, ribbon và CTA, không cắt chữ hoặc overflow. Areas/Recruiting và section mới tự reflow theo breakpoint hiện có.
- Không giảm touch target dưới 44px, không làm mất gutter mobile và không tạo horizontal scroll ở 390px.

**Ownership:** VIS-06 được ghép vào `hrp-v6-ui-04c-home-composition-footer`, không mở rộng correction CTA đang `READY_FOR_AUDIT` sang toàn bộ homepage. Tier 1 đổi task composition/footer từ FAST/NONE thành **STANDARD/FOCUSED**, mở allowlist đúng các component có inner container, và cập nhật Task D để mọi section mới dùng `1080px` ngay từ đầu. Thứ tự vẫn là Interaction R2 correction → composition/footer → section renderer.

## Boundary

- Preserve flip timing, salary front face, semantic Link/button sibling structure, ApplyModal callback, preview disabled behavior, mobile fallback and reduced-motion behavior.
- In-scope correction: `featured-job-card.tsx`, its existing component test, HANDOFF/evidence and TASK revision owned by Tier 1.
- Do not change API, data, page composition, BestJobs pagination or ApplyModal internals.
- VIS-04/VIS-05 thuộc Interaction R2 hiện hành. VIS-06 thuộc task composition/footer kế tiếp và được nghiệm thu như một layout correction toàn homepage.

## Acceptance evidence

1. Component/source test proves the active CTA does not contain a same-token foreground/background hover pair and specifically contains no `hover:text-primary-container`.
2. Component test still proves CTA click opens ApplyModal callback and Link remains a sibling.
3. Source review confirms `.action-area-back` no longer contributes a colored padded ring and only one CTA fill is visible.
4. `npm run typecheck`, relevant component test, full required task gates, `verify-task.ps1` and `verify-handoff.ps1` pass.
5. Handoff returns to `AWAITING_OWNER_LIVE_VISUAL_REVIEW_R2`. Owner performs the live visual review; no CDP/PNG/bbox requirement.
6. Task composition/footer có source review xác nhận mọi inner container homepage dùng `max-w-[1080px]`, desktop không overflow và mobile 390px giữ gutter/touch target; Owner nghiệm thu live sau deploy.

## Instruction to Tier 1

Append VIS-04/VIS-05 to the existing task contract, bump spec/revision, return status to correction execution, and hand the same bounded task to one Tier 2. Do not send it to Tier 3 until Owner R2 confirms the CTA appearance and hover label.

Append VIS-06 to the composition/footer contract, expand its allowlist to the affected homepage layout components, reclassify it as STANDARD/FOCUSED, and update the section-render contract to inherit `max-w-[1080px]`. Do not implement VIS-06 inside the CTA correction round.
