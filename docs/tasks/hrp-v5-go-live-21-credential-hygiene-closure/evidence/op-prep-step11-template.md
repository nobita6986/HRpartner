# OP prep — STEP-11 evidence template (Owner fills during window)

> **Audience:** Owner/OP. Tier 2 prep đã tạo manifest `evidence/go21-s05-demo-manifest.json` + script `scripts/ops/demo-cleanup.mjs`.
> Owner fill template này trong window **2026-09-08 09:00-09:30 Asia/Bangkok**.
> Save as `evidence/go21-s11-demo.txt` after execution.
> **MUST NOT contain PII, phone value thật, hoặc secret — chỉ count + manifest hash + timestamp.**

## 0. Preflight snapshot

```
manifest_path:           evidence/go21-s05-demo-manifest.json
expected_manifest_hash:  3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e
actual_manifest_hash:    ________________________________________
match:                   yes | no
window_start_utc:        2026-09-08T02:00:00Z   (= 09:00 Asia/Bangkok)
window_end_utc:          2026-09-08T02:30:00Z   (= 09:30 Asia/Bangkok)
neon_pitr:               7 days    (RESOLVED via Q-04)
restore_point_check:     2026-09-07 13:42        (RESOLVED via Q-04)
demo_data_policy:        KEEP (backup to scratch/) (RESOLVED via Q-04)
```

If `actual_manifest_hash` != `expected_manifest_hash` → STOP, investigate manifest drift.

## 1. Dry-run count (Owner chạy với Neon safe-read target)

```
node scripts/ops/demo-cleanup.mjs dry-run --db-url=<safe-read DSN>
→ exit: 0
→ manifest_hash: 3fb0d3cc0f6fcb85dc3f3b978a71819f05bc011f8a5d4cad141222a14cfde47e
→ counts:
    vendor:        before=___ (expected 4)
    worker:        before=___ (expected 1)
    vendor_admin:  before=___ (expected 1)
    ctv:           before=___ (expected 1)
```

If any `before` != `expected` → STOP. Owner phải verify manifest.

## 2. Apply (transaction + advisory lock)

```
node scripts/ops/demo-cleanup.mjs apply --manifest-hash=3fb0d3cc... --db-url=<Neon prod DSN>
→ ts_utc: __________
→ exit: 0 | 1 | 2
→ result: SUCCESS | ROLLBACK | FAIL
→ tx_id: ___________________________ (Postgres transaction ID nếu có)
```

If exit != 0 → STOP, capture stderr, rollback manually nếu cần.

## 3. Post-check (Owner verify counts)

```
psql ... -c "SELECT COUNT(*) FROM vendor WHERE code IN ('VND-001','DA-DEMO-001','DA-DEMO-002','DA-DEMO-003')"
→ count: ___ (expected 0)
psql ... -c "SELECT COUNT(*) FROM \"user\" WHERE phone IN ('0910000001','0910000002','0910000003')"
→ count: ___ (expected 0)

non-DEMO sentinel (Owner chọn 1-2 row không DEMO, đếm trước/sau):
sentinel_path:           ____________________________
sentinel_count_before:   ___
sentinel_count_after:    ___
unchanged:               yes | no
```

If `vendor count after` != 0 OR `user count after` != 0 → STOP, investigate rollback.
If sentinel `unchanged` != yes → STOP, investigate non-DEMO collateral.

## 4. Stop conditions

- Dry-run count drift (any section)
- Manifest hash mismatch (between expected and actual)
- Apply exit != 0
- Post-check count != 0 cho allowlist
- Sentinel count changed
- Window overrun (start after 09:00 OR end after 09:30)

## 5. Rollback path

If post-check FAIL:
```
-- Inside same transaction: ROLLBACK automatically (script does this on mismatch)
-- Outside transaction (if already committed):
psql ... -c "INSERT INTO vendor ... (restore from backup);"
psql ... -c "INSERT INTO \"user\" ... (restore from backup);"
```

Restore from `restore_point_check` (Neon PITR 7 days) nếu lỗi chỉ phát hiện sau commit.

## 6. Evidence format

Save complete pre/post counts + manifest hash + transaction log + timestamps UTC vào `evidence/go21-s11-demo.txt`. Tier 3 sẽ verify trong re-audit round 3.
