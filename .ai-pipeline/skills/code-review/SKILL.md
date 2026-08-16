---
name: code-review
description: Use when Tier 3 (Auditor) needs structured review beyond the AUDIT artifact, OR when Tier 1 sanity-checks a HANDOFF. Covers receiving feedback with technical rigor, requesting reviews, and verification gates.
license: HRP-Internal
---

# Code Review

Hướng dẫn thực hành review chặt chẽ cho HRP, dựa trên evidence chứ không phải social comfort.

## Three Practices

1. **Receiving feedback** — technical evaluation over performative agreement.
2. **Requesting reviews** — systematic review via subagent.
3. **Verification gates** — evidence before any completion claims.

## Iron Law

**NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

IDENTIFY command → RUN full command → READ output → VERIFY confirms claim → THEN claim.

Skip any step = lying, not verifying.

## Integration with HRP Tier 3

Tier 3 (Auditor) dùng skill này để:

- `audit` skill đã setup verdict PASS/FAIL/PARTIAL — code-review này bổ sung cho subagent review.
- Khi HANDOFF có claim nghi ngờ → `requesting-code-review` để spawn reviewer.
- Red-flag checklist giống `anti-hallucination.md`, không trùng hai lần.

## Receiving Feedback Protocol

```
READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT
```

- ❌ No performative agreement ("Bạn nói đúng!", "Cảm ơn!").
- ❌ No implementation before verification.
- ✅ Restate requirement, ask questions, push back with technical reasoning.
- ✅ Unclear? STOP and ask for clarification on ALL unclear items.
- ✅ YAGNI check: grep usage trước khi implement suggested feature.

## Verification Gates

| Claim | Phải có |
|---|---|
| Tests pass | Test output shows 0 failures |
| Build succeeds | Build command exit 0 |
| Bug fixed | Test original symptom passes |
| Requirements met | Line-by-line checklist |

## Red Flags

Stop và theo process nếu nghĩ:

- "Quick fix for now"
- "Just try changing X"
- "Should work now" / "Seems fixed"
- "Tests pass, we're done"

## References

- `references/receiving-feedback.md`
- `references/verification-before-completion.md`
- `references/requesting-code-review.md`
