# docs/.recycle — Archive of superseded docs (Owner-curated)

> **DO NOT REVERT.** This directory contains legacy/obsolete docs that the owner
> manually moved out of `docs/` on **2026-09-11** (UTC+7). The move is intentional
> to declutter the active docs surface.

## Why this exists

The active `docs/` tree should only hold documents that are part of the current
pipeline contract (Tier 0/1/3 handover, V6/V7 roadmap, active task specs,
prompts, runbooks). Legacy material from V4/V5 and obsolete Tier 1 playbooks
were retained locally but moved out of the active surface on 2026-09-11.

## What lives here

| Sub-path | Source (old path) | Reason for archive |
|---|---|---|
| `cleanup/` | `docs/cleanup/` | One-off V5 cleanup plan + answers |
| `design/` | `docs/design/` | Figma day-1 checklist + mockup prompt (no longer in active use) |
| `prompts/` | `docs/prompts/` | V6 superseded directives (NEXT_TASK_TIER0, UI_03_HUONGB_VISUAL_PARITY) |
| `reports/` | `docs/reports/` | V5 status report |
| `runbooks/` | `docs/runbooks/` | V5 go-live runbooks (rotated out by V6 hygiene plan) |
| `tasks/` | (none — empty placeholder) | Reserved for archived task specs |
| `*.md` (root) | `docs/*.md` | V4/early-V5 docs, portal plan, competitive analysis, contract templates, contract authoring playbook, unified plans v4/v5 |
| `*.html` (root) | `docs/*.html` | Legacy roadmap HTMLs (v4/portals/portal-aff vision) |

## Rules for agents (Tier 0/1/3)

1. **Do not** `git mv` anything back from `.recycle/` to `docs/` without an
   explicit Tier 0 directive in a dated prompt file under `docs/prompts/`.
2. **Do not** delete `.recycle/` contents. The owner keeps them for reference.
3. **Do not** create new files directly under `.recycle/` root — use the
   appropriate sub-path (`tasks/`, `prompts/`, etc.) when archiving.
4. **Do not** reference `.recycle/` paths in active contracts. If you find
   yourself wanting to cite a `.recycle/` doc, that is a signal the contract
   needs to be re-grounded against an active doc instead.

## Restoring (only by Tier 0)

If a doc turns out to still be needed, Tier 0 issues a dated directive and
Tier 1 `git mv`s it back. Record the directive path in the Revision Log of the
affected active doc.

## Provenance

- Original move commit: see `git log --diff-filter=R -- docs/.recycle/` once
  the move commit is recorded.
- Owner: Tier 0 (manual).
- Date: 2026-09-11 (UTC+7).
