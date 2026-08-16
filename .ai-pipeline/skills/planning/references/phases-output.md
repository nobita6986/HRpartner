# Phases & Output chuẩn HRP

## Phase output structure trong `TASK.md`

Khi Tier 1 ghi `Plan & Design`, dùng structure:

```markdown
## Plan & Design

### Phase <n>: <name>

**Goal**: <1 sentence>
**Inputs**: <what Tier 1 đã thu thập — code references, library docs>
**Outputs**: <deliverables: schema / interface / file:line đề xuất>
**Risks**: <top 3 risks với mitigation>
**Dependency on existing**: <modules/files/symbols>

### Phase <n+1>: ...

### Rollout & Rollback

- **Rollout**: <step-by-step cutover>
- **Rollback**: <step-by-step revert>
- **Smoke test**: <3 commands Tier 2 chạy đầu>
```

## Quy tắc

- Mỗi phase phải verifiable bằng test/check riêng.
- Rollback phải là command thật (không "rollback manually").
- Smoke test dưới 60s cumulative.

## Output theo work type

| Work type | Phase focus |
|---|---|
| `CODE` | TDD shape: phase 1=schema/interface, phase 2=core logic, phase 3=tests |
| `DESIGN` | Phase 1=UI Direction, phase 2=implementation mockup, phase 3=handoff artifact |
| `DOCS` | Phase 1=draft outline, phase 2=content, phase 3=review/sync |
| `DATA` | Phase 1=schema change, phase 2=migration, phase 3=data backfill |
| `INFRA` | Phase 1=IaC, phase 2=deploy dry-run, phase 3=switch traffic |
