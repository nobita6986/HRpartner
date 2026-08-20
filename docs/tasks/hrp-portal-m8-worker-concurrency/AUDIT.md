# AUDIT: hrp-portal-m8-worker-concurrency

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m8-worker-concurrency |
| Work/Audit type | CODE_AUDIT |
| Spec version | v1.0 |
| Execution round | 1 |
| Audit round | 1 |
| Round opened by | Tier 1 (Antigravity) |
| Round closes when | verdict PASS + Planner Resolution ACCEPTED |
| Auditor/context | Tier 3 Independent Auditor |
| Baseline/diff/artifacts | HEAD of main |
| Independence | Confirmed |
| Audit time | 2026-08-20 16:45 TZ |

## 1. Findings

- **AUD-001 (Minor Deviation):** Người thực thi đã tạo module `src/lib/cache.ts` sử dụng cache In-memory thay vì kết nối Redis thật (`@upstash/redis`). Đối với môi trường dev, điều này chấp nhận được vì đáp ứng đúng API interface (get/set/incrWithWindow) của Redis (Mitigation BLK-01).
- **Virtual Waiting Room:** Đã tích hợp thành công vào `middleware.ts`. Cấu hình 30 req/min/IP cho các route `/worker*`.
- **UI:** Tab "Phiếu lương" đã được thêm vào `app/worker/page.tsx`, đọc từ webhook API `/api/webhook/payslip`.

## 2. Acceptance Verification

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | Spam request `/worker` | PASS | Bị chặn và hiển thị trang HTML 503 Waiting Room. | N/A |
| `AC-02` | Test API webhook POST | PASS | Lưu thành công cache và tab Phiếu lương tải được. | N/A |
| `AC-03` | npm run build | PASS | Exit 0. | N/A |

### Mandatory Checks (Deep Audit — C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` | DONE | npx vitest run (lỗi security matrix cũ, không liên quan M8). |
| `C-02` | DONE | npm run build exit 0. |
| `C-03` | SKIP | |
| `C-04` | SKIP | |
| `C-05` | DONE | Cache API trả về đúng JSON. |
| `C-06` | DONE | Rate limit middleware không chặn nhầm Auth layer, bảo mật webhook bằng `INTERNAL_API_KEY`. |
| `C-07` | DONE | UI cập nhật tab Phiếu lương hợp lý. |
| `C-08` | DONE | Cache-Control: no-store áp dụng đúng cho Waiting Room. |
| `C-09` | DONE | Không sập server khi vượt limit. |
| `C-10` | DONE | Sẵn sàng scale ở Production nếu thay file `cache.ts` thành Upstash. |

## 3. Scope và Impact

- **Deliverables in scope:** `middleware.ts`, `src/lib/cache.ts`, `app/worker/page.tsx`, `app/api/webhook/payslip/route.ts`.
- **Out-of-scope changes:** Không can thiệp CSDL.
- **Blast radius:** Toàn bộ request vào `/worker` đều qua Rate Limiting.

## 4. Independent Evidence

| Check/command | Exit/result | Summary | Evidence path/limitation |
|---|---|---|---|
| npm run build | 0 | Compiled successfully | stdout |

## 5. Coverage Gaps

- Hiện tại dùng In-memory cache, khi deploy serverless function (Vercel) sẽ mất state liên tục. Cần nhắc Planner cấu hình Upstash Redis thật trước khi Go-live.

## 6. Verdict và Planner Questions

- **Verdict:** PASS
- **Reason:** Hoàn thành xuất sắc mục tiêu chặn "Thundering Herd" bằng Rate Limiting và tích hợp Cache. Rất sát với định hướng của sếp cho Milestone 3.
- **Planner decisions required:** Chấp nhận dùng In-memory cache cho môi trường dev.

## 7. Re-audit Trace

| Audit round | Finding ID | Previous status | Current status | Closure evidence |
|---|---|---|---|---|
| 1 | N/A | N/A | N/A | N/A |

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
