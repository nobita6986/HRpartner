---
name: frontend-design
description: Use when Tier 2 (Engineer) creates a UI artifact (page, component, mockup) AND the TASK has Work type = DESIGN or UI-heavy CODE. Enforces intentional aesthetic direction and avoids generic AI-slop aesthetics.
license: HRP-Internal
---

# Frontend Design (Anti AI-Slop)

Tạo frontend production-grade với aesthetic direction rõ ràng. Tránh generic "AI slop" aesthetics.

> **Scope HRP**: chỉ áp dụng cho TASK `Work type = DESIGN` hoặc UI-heavy CODE. Backend-only task → skip.

## When to Use

- Tier 1 định nghĩa aesthetic direction trong `TASK.md > Plan & Design > UI Direction`.
- Tier 2 implement theo direction đó.
- Tier 3 verify theo `Testing Protocol > UI` matrix.

## Design Thinking

Trước khi code, hiểu context và commit một **BOLD aesthetic direction**:

- **Purpose**: problem giải, audience.
- **Tone**: brutalist minimal, maximalist chaos, retro-futuristic, organic, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian.
- **Constraints**: framework, performance, accessibility.
- **Differentiation**: cái gì UNFORGETTABLE — một detail người dùng sẽ nhớ.

**CRITICAL**: chọn một direction rõ ràng và execute precision. Bold maximalism và refined minimalism đều OK — key là intentionality.

## Aesthetics Focus

| Aspect | Rule |
|---|---|
| Typography | Fonts beautiful/unique/interesting. Tránh Arial/Inter generic. |
| Color & Theme | Cohesive aesthetic, CSS variables. Dominant colors with sharp accents. |
| Motion | CSS-only cho HTML, Motion/anime.js cho React. Staggered reveals. |
| Spatial | Unexpected layouts, asymmetry, overlap, diagonal flow, generous negative space. |
| Backgrounds | Atmosphere thay vì solid colors: gradient meshes, noise textures, decorative borders. |
| Assets | `ai-multimodal` (Gemini) generate aligned assets. |

## Forbidden Aesthetic

❌ Inter / Roboto / Arial / system fonts.
❌ Purple gradient on white.
❌ Predictable layouts.
❌ Cookie-cutter design.

## Refactor & Reconcile

Khi Tier 3 reject vì aesthetic chưa đạt:

- Tier 1 update `UI Direction` block trong TASK.md (AC mới).
- Tier 2 re-implement theo direction mới.

## References

- `references/hrp-visual-style.md` — visual style mà HRP đã chốt ở phase hiện tại
- `references/anti-slop-checklist.md` — 12 điểm check trước khi claim DESIGN PASS
