---
name: problem-solving
description: Use when Tier 1 or Tier 3 (Auditor) encounters complexity spirals, innovation blocks, recurring patterns, assumption constraints, or scale uncertainty. Six dispatchable techniques adapted from Microsoft Amplifier project patterns.
license: HRP-Internal
---

# Problem-Solving Techniques

Systematic approaches for different types of stuck-ness. Mỗi technique target một problem pattern.

## When to Use

Apply when encountering:

- **Complexity spiraling** — multiple implementations, growing special cases.
- **Innovation blocks** — conventional solutions inadequate, cần breakthrough.
- **Recurring patterns** — same issue across domains, reinventing solutions.
- **Assumption constraints** — forced into "only way", không thể question premise.
- **Scale uncertainty** — production readiness unclear, edge cases unknown.
- **General stuck-ness** — unsure which technique applies.

## Quick Dispatch

| Stuck Symptom | Technique | Reference |
|---|---|---|
| Same thing 5+ ways, growing special cases | **Simplification Cascades** | `simplification-cascades.md` |
| Conventional solutions inadequate | **Collision-Zone Thinking** | `collision-zone-thinking.md` |
| Same issue in different places | **Meta-Pattern Recognition** | `meta-pattern-recognition.md` |
| Solution feels forced | **Inversion Exercise** | `inversion-exercise.md` |
| Will this work at production? | **Scale Game** | `scale-game.md` |
| Unsure which to use | **When Stuck** | `when-stuck.md` |

## Core Techniques (one-liner)

1. **Simplification Cascades** — find one insight eliminating multiple components.
2. **Collision-Zone Thinking** — force unrelated concepts together.
3. **Meta-Pattern Recognition** — patterns in 3+ domains → universal principle.
4. **Inversion Exercise** — flip core assumptions.
5. **Scale Game** — test at 1000x extremes.

## Application Process

1. Identify stuck-type (match symptom).
2. Read specific technique from `references/`.
3. Apply systematically.
4. Document insights in `TASK.md` (Planner) or `AUDIT.md` (Auditor).
5. Combine if needed.

## References

- `references/simplification-cascades.md`
- `references/collision-zone-thinking.md`
- `references/meta-pattern-recognition.md`
- `references/inversion-exercise.md`
- `references/scale-game.md`
- `references/when-stuck.md`
