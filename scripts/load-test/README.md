# Load Test Scripts — Phase 5 UAT/Cutover STEP-07 (RQ-11)

## Thresholds

| Metric | Threshold |
|---|---|
| p95 response time | < 2s |
| Error rate | < 1% |

## Scripts

| Script | VUs | Target | Scenario |
|---|---|---|---|
| `k6-checkin.js` | 5,000 | POST /api/tickets | Create ticket (check-in) |
| `k6-transfer.js` | 100 | POST /api/staffing/transfers | Worker transfer |
| `k6-statement.js` | 20 | GET /api/statements | List + margin |

## Prerequisites

```bash
# Install k6
brew install k6    # macOS
# or: https://k6.io/docs/getting-started/installation/
```

## Usage

```bash
# Local (app running on localhost:3000)
k6 run scripts/load-test/k6-checkin.js
k6 run scripts/load-test/k6-transfer.js
k6 run scripts/load-test/k6-statement.js

# Production
k6 run -e BASE_URL=https://hrp-erp.vercel.app \
       -e ADMIN_PHONE=09xxxxxxxx \
       -e ADMIN_PASSWORD=secret \
  scripts/load-test/k6-checkin.js

# All scripts
for s in k6-checkin.js k6-transfer.js k6-statement.js; do
  k6 run -e BASE_URL=https://hrp-erp.vercel.app scripts/load-test/$s
done
```

## Output Example

```
     ✓ k6-checkin    p95: 1,234ms  ✓ (< 2,000ms)
     ✓ k6-transfer   p95:   456ms  ✓ (< 2,000ms)
     ✓ k6-statement  p95:   789ms  ✓ (< 2,000ms)
```
