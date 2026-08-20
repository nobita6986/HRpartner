# HANDOFF: hrp-portal-m9-affiliate-vendor

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-portal-m9-affiliate-vendor` |
| Work type | `CODE` |
| Audit mode | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `HEAD of main` |
| Status | `READY_FOR_AUDIT` |
| Updated | `2026-08-20 21:41 UTC+7` |

## 1. Outcome Summary

**M9 Affiliate-Vendor hoàn thành:**

- **CTV Dashboard** (`app/ctv/page.tsx`): Redesign với gamification (LevelBadge), inline SVG bar chart thu nhập, tab "Phiếu lương" đầy đủ.
- **CTV Withdrawal** (`app/api/ctv/withdrawals/route.ts`): POST tạo yêu cầu rút tiền + GET list. MVP lưu JSON (cần migration `CtvWithdrawalRequest` production).
- **Vendor UI** (`app/vendor/page.tsx`): Đồng bộ với Design System, tab Đối soát hiển thị statements với status colors.

## 2. Execution Trace

| STEP | RQ | File/artifact | Result | Deviation |
|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `app/ctv/page.tsx` | `DONE` | Dùng inline SVG chart thay vì Recharts (tránh bundle bloat) |
| `STEP-02` | `RQ-02` | `app/api/ctv/withdrawals/route.ts` | `DONE` | MVP: JSON file store → cần migration production |
| `STEP-03` | `RQ-03` | `app/vendor/page.tsx` | `DONE` | None |
| `STEP-04` | `RQ-04` | `app/vendor/page.tsx` (statements tab) | `DONE` | Tích hợp vào tab thay vì trang riêng |
| `STEP-05` | `RQ-05` | Build | `DONE` | `npm run build` exit 0 |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence | Limitation |
|---|---|---|---|---|
| `AC-03` | `npm run build` | `exit 0` | `/ctv`, `/vendor` routes compile | None |
| `AC-01` | Manual: vào `/ctv` | Dashboard + chart hiển thị | Build output 3.43kB | Must test in dev |
| `AC-02` | Manual: vào `/vendor` → tab Đối soát | Statements hiển thị | Build output 2.67kB | Must test in dev |

## 4. Changed Deliverables

### Modified Files
- `app/ctv/page.tsx` — Redo UI với gamification + chart + withdrawal
- `app/vendor/page.tsx` — Design system sync + statements tab

### New Files
- `app/api/ctv/withdrawals/route.ts` — Withdrawal request API (MVP JSON store)
- `data/withdrawals.json` — Auto-created on first POST

### Environment/Config
- **None**

### Schema
- **None** — `CtvWithdrawalRequest` model chưa tồn tại (MVP dùng JSON)

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed |
|---|---|---|---|---|
| `BLK-01` | `Deviation` | CTV withdrawal dùng JSON store thay vì DB | Không bền vững production | Planner: accept MVP? |
| `BLK-02` | `Limitation` | Không có chart library thật (inline SVG) | Chart đơn giản | Planner: accept inline SVG? |

## 6. API Summary

### POST /api/ctv/withdrawals
- **Auth**: CTV role
- **Body**: `{ amountVnd: number, bankAccount: string, bankName: string }`
- **Returns**: `{ withdrawal: Record, note: string }`
- **Storage**: `data/withdrawals.json` (MVP)

### GET /api/ctv/withdrawals
- **Auth**: CTV role
- **Returns**: `{ items: WithdrawalRecord[] }`

## 7. Security Notes

- Withdrawal API chỉ CTV role được phép
- Auth context validated trước khi xử lý
- Amount validated > 0

## 8. Production Migration Path

1. Tạo migration `CtvWithdrawalRequest` model vào schema
2. Thay JSON store bằng Prisma query
3. Tích hợp withdrawal history vào CTV dashboard
4. Thêm admin approval flow cho withdrawals

## 9. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | CTV redesign + withdrawal + vendor sync + statements |

> Handoff status: `READY_FOR_AUDIT`
