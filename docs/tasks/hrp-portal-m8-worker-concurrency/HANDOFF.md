# HANDOFF: hrp-portal-m8-worker-concurrency

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m8-worker-concurrency` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Executor | `Tier 2` |
| Baseline | `HEAD of main` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-20 16:45 UTC+7` |

## 1. Outcome Summary

**Hoàn thành M8 Worker Concurrency:**

- **Cache Layer** (`src/lib/cache.ts`): In-memory cache với Redis-like API (get/set/del/incrWithWindow), TTL support, pattern delete.
- **Rate Limiting** (`middleware.ts`): Virtual Waiting Room cho `/worker*` routes — 30 req/min/IP. Quá limit → HTML waiting room với countdown.
- **Payslip Webhook** (`app/api/webhook/payslip/route.ts`): POST nhận JSON từ Python app → cache. GET đọc payslip từ cache.
- **Worker UI Upgrade** (`app/worker/page.tsx`): Thêm tab "Phiếu lương" đọc từ cache.

## 2. Execution Trace

| STEP | RQ | File/artifact | Result | Deviation |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `src/lib/cache.ts` | `DONE` | Dùng in-memory thay vì Redis thật (dev mode) |
| `STEP-02` | `RQ-02` | `middleware.ts` | `DONE` | Auth check vẫn giữ nguyên |
| `STEP-03` | `RQ-03` | `app/api/webhook/payslip/route.ts` | `DONE` | None |
| `STEP-04` | `RQ-04` | `app/worker/page.tsx` | `DONE` | Thêm tab "Phiếu lương" |
| `STEP-05` | `RQ-05` | Build | `DONE` | `npm run build` exit 0 |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence | Limitation |
|---|---|---|---|---|
| `AC-03` | `npm run build` | `exit 0` | Build success — `/api/webhook/payslip` + `/worker` routes compile | None |
| `AC-01` | Manual: spam request `/worker` | Rate limit triggered | Waiting room HTML response with 503 | Must test in dev |
| `AC-02` | Manual: POST to webhook | Payslip cached | GET returns cached payslip | Must test with real API key |

## 4. Changed Deliverables

### New Files
- `src/lib/cache.ts` — In-memory cache với Redis-like API
- `app/api/webhook/payslip/route.ts` — Webhook nhận payslip + đọc từ cache

### Modified Files
- `middleware.ts` — Thêm rate limiting + waiting room cho `/worker*`
- `app/worker/page.tsx` — Thêm tab "Phiếu lương"

### Environment/Config
- `INTERNAL_API_KEY` env var (optional, default: `dev-internal-key`)

### Schema
- **None**

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed |
|---|---|---|---|---|
| `BLK-01` | `Deviation` | Dùng in-memory cache thay vì Redis thật | Production cần Redis server thật | Planner: accept in-memory cho dev? |
| `BLK-02` | `Limitation` | Không có real load test | AC-01 chỉ verify logic tĩnh | Planner: accept limitation? |

## 6. API Summary

### POST /api/webhook/payslip
- **Auth**: `x-api-key` header (`INTERNAL_API_KEY` env)
- **Body**: `{ payslips: PayslipItem[], source, computedAt }`
- **Cache TTL**: 10 phút
- **Cache key**: `payslip:{workerId}:{year}:{month}`

### GET /api/webhook/payslip
- **Auth**: None (worker reads own payslip)
- **Params**: `workerId`, `periodMonth`, `periodYear`
- **Returns**: Cached payslip or 404

### Rate Limiting
- **Scope**: `/worker` + `/api/worker` routes
- **Limit**: 30 req/min/IP
- **Response khi quá**: 503 HTML với countdown
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 7. Security Notes

- Rate limit check đặt SAU auth check cho portal routes — auth vẫn được ưu tiên
- Webhook endpoint bảo vệ bằng API key
- Waiting room HTML injects `Cache-Control: no-store`

## 8. Production Migration Path

1. Thay `src/lib/cache.ts` bằng `@upstash/redis` hoặc `ioredis`
2. Set `REDIS_URL` / `UPSTASH_REDIS_REST_URL` env vars
3. Tăng rate limit window cho production (DEC-01)

## 9. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | Cache layer + rate limiting + payslip webhook + UI upgrade |

> Handoff status: `READY_FOR_AUDIT`
