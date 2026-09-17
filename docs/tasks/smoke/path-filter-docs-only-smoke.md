# Smoke test for docs-only path-filter behavior

This file exists solely to verify that PR #13's `hrp-v7-ci-path-filter` correctly
short-circuits Integration to `success` (banner: "docs/config-only — Integration
skipped") when the diff is exclusively inside the docs allowlist.

Expected CI:
- Quality: pass
- Integration: pass via short-circuit success branch (no DB secrets touched)

Created and merged/closed by Tier 1 smoke test on 2026-09-18.
