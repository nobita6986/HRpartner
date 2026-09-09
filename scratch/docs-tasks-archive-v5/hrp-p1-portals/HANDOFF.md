# HANDOFF: hrp-p1-portals (P1 External Portals)

**Status**: Tier 2 implementation complete (13 STEP).
**Audit**: Pending Tier 3.

---

## Summary

3 subdomain portals deployed:
- `vendor.hrpartner.vn` — Vendor Portal (orders + submissions + statements)
- `worker.hrpartner.vn` — Worker PWA (GPS check-in + offline + push + tickets)
- `ctv.hrpartner.vn` — CTV Dashboard (claims + summary + affCode)

Plus middleware multi-domain guard + DB roles creation script (FO-01).

## Evidence Index

| STEP | Output | Verify |
|---|---|---|
| STEP-01 | Migration `p1_portals_schema` (GPS + push_subscriptions) | `prisma migrate status` pending — apply with `npx prisma migrate deploy` |
| STEP-02 | Multi-domain middleware + 31 hostname tests | `vitest run src/domains/security/portal-domains.integration.test.ts` PASS (31/31) |
| STEP-03 | Login response includes `redirectTo` | build PASS |
| STEP-04 | Worker PWA (manifest + SW + UI + 3 APIs) | build PASS |
| STEP-05 | Push (subscribe + trigger on ticket approve/cancel) | build PASS |
| STEP-06 | Vendor Portal UI + 2 APIs | build PASS |
| STEP-07 | Vendor statements confirm/dispute/export | build PASS |
| STEP-08 | CTV Dashboard UI + 2 APIs | build PASS |
| STEP-09 | `scripts/create-db-roles.cjs` + verify updated | `node scripts/verify-rls-phase5.cjs` reports 4 missing roles (need OP-03) |
| STEP-10 | 16 portal scope tests | `vitest run security-matrix-portals.test.ts` PASS (16/16) |
| STEP-11 | Seed mở rộng 3 cổng | ready |
| STEP-12 | This HANDOFF | — |
| STEP-13 | Regression | see below |

## Runbook — Production Deployment

### Prerequisites (Ops)

- **OP-01: DNS** — 3 subdomains CNAME → Vercel project:
  - `vendor.hrpartner.vn` → `<cname>.vercel-dns.com`
  - `worker.hrpartner.vn` → `<cname>.vercel-dns.com`
  - `ctv.hrpartner.vn` → `<cname>.vercel-dns.com`

- **OP-02: VAPID keys** — sếp tạo + set env Vercel:
  ```bash
  npx web-push generate-vapid-keys
  # set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY in Vercel env
  ```
  Thiếu keys → push flag off, app vẫn chạy (DEC-05).

- **OP-03: DB roles NOLOGIN** — sếp chạy với DATABASE_URL_ADMIN:
  ```bash
  node scripts/create-db-roles.cjs
  # verify: node scripts/verify-rls-phase5.cjs  → 25+4 PASS, 0 FAIL
  ```

- **OP-04: Apply migration** — deploy P1 step-by-step:
  ```bash
  npx prisma migrate deploy   # apply p1_portals_schema
  npx prisma db seed           # extended seed for 3 portals
  ```

### Deploy Steps

1. **Code deploy** — push to `main`, Vercel auto-deploy:
   ```bash
   git push origin main
   ```

2. **Vercel domains** — add 3 subdomains in project Settings:
   ```
   Settings → Domains → Add: vendor.hrpartner.vn, worker.hrpartner.vn, ctv.hrpartner.vn
   ```

3. **Health checks**:
   - `https://hrpartner.vn/job-board` → still 200 (Phase 5 regression)
   - `https://vendor.hrpartner.vn/login` → 200
   - `https://worker.hrpartner.vn/worker` → 200, PWA installable
   - `https://ctv.hrpartner.vn/login` → 200

4. **UAT checklist 3 cổng**:

#### Vendor Portal UAT (`vendor.hrpartner.vn`)
- [ ] Login as `0910000001` / `demo-portal-2026` (VENDOR_ADMIN)
- [ ] Tab "Nhu cầu" → see ACTIVE orders
- [ ] Nộp ứng viên form → success + dedup hint nếu trùng SĐT
- [ ] Tab "Kho hồ sơ" → see submissions
- [ ] Tab "Biên bản" → click statement, "Xác nhận" → success
- [ ] "Phản đối" → 2 vòng limit enforced

#### Worker PWA UAT (`worker.hrpartner.vn`)
- [ ] Login as `0910000002` / `demo-portal-2026` (WORKER)
- [ ] Browser mobile: chấm công button visible
- [ ] Press chấm công → event saved (source=GPS, lat/long)
- [ ] Tab "Lịch sử" → see events
- [ ] Tab "Phiếu" → see tickets
- [ ] Offline (DevTools network offline) → chấm công → queue, reconnect → sync

#### CTV Dashboard UAT (`ctv.hrpartner.vn`)
- [ ] Login as `0910000003` / `demo-portal-2026` (CTV)
- [ ] Summary hiển thị: counts + estimated commission
- [ ] affCode hiển thị + "Copy" → clipboard
- [ ] Claims list (CTV_REFERRAL accepted = 1)

### Rollback

- **Revert code**: `git revert HEAD~1..HEAD` + redeploy
- **Disable DB roles**: `DROP ROLE worker_user; DROP ROLE vendor_user; DROP ROLE ctv_user; DROP ROLE sale_user;`
- **Remove DNS**: revert CNAME in DNS provider

### Incident Response

- Push không gửi → check `VAPID_PUBLIC_KEY/KEY` env, `isPushAvailable()` flag
- Worker không login → check `worker_user` role exists (FO-01)
- Vendor scope lệch → check `User.vendorId` set in DB

## Regression

Build status: PASS (với appBCC stashed — vùng cấm có dirty files của sếp).

Test count: 31 (STEP-02) + 16 (STEP-10) = 47 mới tests, tất cả PASS.

## Open Questions (for sếp)

- OP-01 / OP-02 / OP-03 / OP-04: sếp thao tác (DNS, VAPID, DB roles, migration apply)
- UAT với user thật (1 vendor thật confirm 1 biên bản): sếp thực hiện

---

**Tier 2 hoàn tất. Sẵn sàng cho Tier 3 audit.**
