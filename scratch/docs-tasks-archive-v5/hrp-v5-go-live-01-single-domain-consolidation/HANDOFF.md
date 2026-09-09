# HANDOFF: hrp-v5-go-live-01-single-domain-consolidation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-01-single-domain-consolidation` |
| Work type | `CODE` |
| Tier | `Tier 2 (Engineer)` — một luồng, chạy sau M1-08 |
| Spec version (TASK) | `v1.1` (chốt canonical gate `npm run test:unit`; Tier-1 resolution `BLK-01`, DEC-11) |
| Execution round | `2` |
| Baseline task (pin) | `2cd8a5594479c50c2a165ca41012402a6e549546` (M1-08 ACCEPTED) |
| Working-tree HEAD | `2163883` (`docs(m1): draft current field projection closure`) |
| Updated | `2026-08-28 Asia/Bangkok` |
| **Handoff status** | **`READY_FOR_AUDIT`** (canonical gate `npm run test:unit` PASS 1187/1187; blocker round-1 đã được Tier-1 giải quyết qua `BLK-01` → xem §9) |

> Ghi chú trung thực (round 2): toàn bộ code + test in-scope HOÀN TẤT; **canonical fail-closed unit gate `npm run test:unit` xanh 1187/1187** (exit 0), build exit 0, tsc/eslint/verify-task/diff-check exit 0. KHÔNG sửa source ở round 2 (không phát hiện regression mới — test:unit 0 fail). Raw `npx vitest run` (default config) vẫn exit 1 do **G0 infrastructure debt** (`placement-panel.test.ts` thiếu automatic JSX + default config đọc DB ambient) — theo DEC-11 + `BLK-01` đây KHÔNG phải quality gate của repo, được ghi riêng, **KHÔNG kể thành PASS, KHÔNG block task** (đã mở G0-04b — §9).

## 1. Tóm tắt thay đổi (routing-only)

Hợp nhất HRP về một canonical origin `https://hrpartner.vn`, bỏ điều hướng role→subdomain:

- Login API trả `redirectTo` là **relative path** theo role (`/vendor`, `/worker`, `/ctv`); internal role → không có `redirectTo`.
- Middleware bỏ nhánh role→hostname; thêm nhánh **legacy-host 308** (đúng 3 host allowlist) về canonical; giữ nguyên auth 401/`bcc` fence/worker rate-limit/`x-request-id`.
- Cookie phiên chuyển **host-only**; login + logout đồng thời **expire cookie domain-scoped cũ** (`.hrpartner.vn`) trong giai đoạn chuyển tiếp (production).
- Login page bỏ phụ thuộc hostname (subtitle generic); login-form validate target same-origin (open-redirect guard).
- KHÔNG đổi RBAC/permission/RLS/Prisma/business logic/authorization; KHÔNG đụng M1-08; KHÔNG DNS/Vercel/env/deploy/commit/push (chỉ runbook — §8).

## 2. Preflight (STEP-00)

- `git status --short` (§6): chỉ 7 file tracked in-scope đã sửa + 2 file mới in-scope (mine); 6 file untracked NGOÀI SCOPE có sẵn từ trước — KHÔNG chạm (liệt kê §6.2).
- Không có overlapping WIP M1-08 trong diff (`git diff --name-only` = đúng 7 file in-scope).
- Dependency M1-08 ACCEPTED (baseline pin `2cd8a55`); `verify-task.ps1` = PASS (§4). Không stash/reset/xóa commit agent khác.

## 3. Thực thi theo STEP (STEP-00 → STEP-07)

| STEP | Nội dung | Kết quả |
|---|---|---|
| STEP-00 | Preflight: git status, dependency M1-08 ACCEPTED, verify-task | XONG (§2, §4) |
| STEP-01 | Tạo source-of-truth `src/shared/routing/portal-landing.ts` (canonical origin, landing map, open-redirect guard, legacy allowlist) | XONG |
| STEP-02 | Middleware: bỏ role→subdomain; thêm nhánh legacy-host 308; giữ auth/fence/rate-limit/x-request-id | XONG |
| STEP-03 | Login route: `redirectTo` relative theo role; cookie host-only + xoá legacy domain-scoped (prod) | XONG |
| STEP-04 | Logout route: xoá cookie host-only + legacy domain-scoped (prod); Login page/form bỏ phụ thuộc hostname + sanitize callback | XONG |
| STEP-05 | Test: mới `single-domain-consolidation.test.ts` (18); viết lại `portal-domains.integration.test.ts` (49) + sửa `security-matrix-portals.test.ts` (18) dùng helper thật | XONG (85 pass targeted) |
| STEP-06 | Chạy toàn bộ gate (round 2) | XONG — canonical gate `npm run test:unit` PASS 1187/1187 + tsc/eslint/build/diff-check exit 0; raw `npx vitest run` = G0 debt, ghi riêng, không PASS/không block (§9) |
| STEP-07 | Viết + cập nhật HANDOFF.md round 2 → `READY_FOR_AUDIT` | XONG |

## 4. Bằng chứng gate (REAL — command + exit code + output)

Chạy lại toàn bộ tại working-tree HEAD `2163883`, ngày 2026-08-28 (execution round 2).

| # | Lệnh | Exit | Kết quả tóm tắt |
|---|---|---|---|
| 1 | `git status --short` | 0 | 7 tracked in-scope M + 2 untracked mine + 6 untracked pre-existing (§6); source KHÔNG đổi ở round 2 |
| 2 | `git diff --name-only` | 0 | ĐÚNG 7 file in-scope (không lẫn M1-08) |
| 3 | `git diff --check` | 0 | Sạch (chỉ warning LF→CRLF vô hại) |
| 4 | `.ai-pipeline/scripts/verify-task.ps1 -TaskPath …/TASK.md` | 0 | `RESULT: DRAFT-VALID (1 warning)` — 1 warning non-blocking (`Status=REVISION_REQUIRED`, chu kỳ revision round 2); exit 0 |
| 5 | `npx tsc --noEmit` | 0 | Không lỗi type |
| 6 | `npx eslint` (9 file in-scope) | 0 | Không lỗi lint |
| 7 | `npx vitest run` (3 suite security in-scope) | 0 | `Test Files 3 passed (3)` · `Tests 85 passed (85)` |
| 8 | **`npm run test:unit`** (canonical fail-closed gate — DEC-11) | **0** | `Test Files 79 passed (79)` · `Tests 1187 passed (1187)` — **CANONICAL GATE PASS** |
| 9 | `npm run build` | 0 | Build thành công; Middleware 41.3 kB; routes /login,/vendor,/worker,/ctv OK |
| 10 | `npx vitest run` (default config — **G0 debt, KHÔNG phải gate**) | 1 | `Test Files 1 failed \| 82 passed \| 10 skipped (93)` · `Tests 24 failed \| 1250 passed \| 245 skipped (1519)` — chỉ `placement-panel.test.ts` fail "React is not defined". Ghi riêng, **KHÔNG kể PASS, KHÔNG block** (DEC-11/BLK-01, G0-04b — §9) |

> **Gate quyết định = #8 `npm run test:unit`** (DEC-11): dùng automatic JSX + ép mọi DB về unreachable sentinel (fail-closed). #10 `npx vitest run` (default config) thiếu `esbuild.jsx:'automatic'` VÀ đọc ambient/repo `.env` DB URL → KHÔNG phải lane an toàn để quyết định task; phân loại **G0 infrastructure debt** (task riêng G0-04b). Mọi gate quyết định còn lại exit 0.

**ripgrep (`rg`) note:** `rg` không có trên PATH của shell (đã thử `rg` và `npx --no-install rg` đều fail). Inventory AC-08 (§7) tạo bằng công cụ Grep của harness (cùng engine ripgrep). Đề xuất Tier 3 chạy `rg` literal nếu môi trường audit có sẵn để đối chiếu.

## 5. Bằng chứng theo AC (AC-01 → AC-12)

| AC | Trạng thái | Bằng chứng |
|---|---|---|
| AC-01 (RQ-01) | ✅ MET | `security-matrix-portals.test.ts` + `portal-domains.integration.test.ts` table-driven `getLandingPath` (4 portal role → `/vendor`\|`/worker`\|`/ctv`; 9 internal role → null; relative, no `https:`); login `redirectTo` per-role trong `single-domain-consolidation.test.ts` block C. 85 pass. |
| AC-02 (RQ-02) | ✅ MET | `portal-domains.integration.test.ts` matrix `isSafeCallbackPath`/`sanitizeCallbackPath`: 5 SAFE pass; 11 HOSTILE (`//evil`, `https://evil`, `javascript:`, `/\evil`, CRLF, TAB, no-slash, empty) rejected; non-string rejected. |
| AC-03 (RQ-03) | ✅ MET | `single-domain-consolidation.test.ts` block B: unauth `/api/vendor`→401 `UNAUTHORIZED`; `/vendor/orders`→login redirect `callback=/vendor/orders`; `/bcc` page→login & `/bcc/api/x`→401; worker `X-RateLimit-Remaining/Reset` + 2 kênh `x-request-id`; inbound id reused. |
| AC-04 (RQ-04) | ✅ MET | block A + `buildLegacyCanonicalUrl` tests: 3 root→landing (query dropped); non-root `/vendor/orders?tab=active` preserved; `x-forwarded-host` legacy → target origin ALWAYS canonical; 4 spoofed host KHÔNG 308; canonical host → no loop. |
| AC-05 (RQ-05) | ✅ MET | block C/D header-level (masked §7-cookie): dev 1 cookie host-only (no Domain/Secure); prod 2 (live Secure+no Domain + legacy `Domain=.hrpartner.vn` Max-Age=0 Secure); logout dev 1 / prod 2 deletion. Token đã mask `fake.jwt.token`. |
| AC-06 (RQ-06) | ✅ MET | Diff `app/login/page.tsx` (bỏ subtitle-theo-subdomain, generic `<LoginForm/>` trong Suspense) + `login-form.tsx`; `npm run build` exit 0 (route `/login` prerendered OK). |
| AC-07 (RQ-07) | ✅ MET | `portal-domains.integration.test.ts` VIẾT LẠI: import & exercise `@/src/shared/routing/portal-landing` (header ghi rõ loại bỏ anti-pattern EV-08 "test tự khai lại logic"); assertion phủ role/cookie/redirect/host. Coverage §5.1. |
| AC-08 (RQ-08) | ✅ MET | Inventory §7: KHÔNG có runtime navigation/role-map tới subdomain; literal còn lại chỉ ở allowlist `portal-landing.ts:73-76`, 2 test file, comment/doc, và email `@hrpartner.vn`. (`rg` vắng mặt → Grep harness cùng engine.) |
| AC-09 (RQ-09) | ✅ MET | Runbook OP §8 theo đúng thứ tự preview → root smoke → legacy redirect → monitoring → tháo domain; KHÔNG chứa secret (chỉ tên biến). |
| AC-10 (RQ-10) | ✅ MET | block C bad-cred/locked/malformed→401 `INVALID_CREDENTIALS`, 0 cookie, `mockSignJwt` KHÔNG được gọi; diff `login/route.ts` giữ nguyên `signJwt`/`JWT_TTL_SECONDS`/`findUserForLogin`/zod; `npm run test:unit` 1187 pass (no regression). |
| AC-11 (all) | ✅ MET | Canonical fail-closed gate `npm run test:unit` exit 0 (1187/1187) + `npx tsc --noEmit` + scoped eslint + `npm run build` + `git diff --check` đều exit 0 (§4 #3,5,6,8,9). Raw `npx vitest run` (default config) exit 1 do `placement-panel.test.ts` (pre-existing, ngoài scope) → GHI RIÊNG là G0 infrastructure debt, KHÔNG kể thành PASS nhưng KHÔNG block (DEC-11/BLK-01 → G0-04b; §9). Đúng theo AC-11 v1.1. |
| AC-12 (scope) | ✅ MET | §6: diff ĐÚNG allowlist; không M1-08 WIP; không env/secret; không AUDIT.md; 6 untracked ngoài scope là pre-existing, KHÔNG chạm. |

### 5.1 Coverage (AC-07) — test dùng source-of-truth, không tự khai lại

| Suite | Tests | Nhập helper thật | Phủ |
|---|---|---|---|
| `single-domain-consolidation.test.ts` (mới) | 18 | `middleware`, `loginPOST`, `logoutPOST`, `CANONICAL_ORIGIN`, `AUTH_COOKIE_NAME` (real) | legacy 308, regression fence, cookie login/logout |
| `portal-domains.integration.test.ts` (viết lại) | 49 | toàn bộ `portal-landing` (getLandingPath, isSafeCallbackPath, isLegacyPortalHost, buildLegacyCanonicalUrl, isPortalPath) | mapping, open-redirect matrix, allowlist |
| `security-matrix-portals.test.ts` (sửa) | 18 | `getLandingPath` | scope + landing per role |

### 5.2 Cookie evidence (MASKED — không chép token thật)

Token hiển thị dạng placeholder `fake.jwt.token`; assertion ở cấp header string:

```
# LOGIN prod (VENDOR_*) → 2 Set-Cookie:
hrp_session=<TOKEN>; Path=/; Max-Age=28800; HttpOnly; SameSite=Lax; Secure          # host-only (no Domain=)
hrp_session=;        Path=/; Max-Age=0;     HttpOnly; SameSite=Lax; Secure; Domain=.hrpartner.vn   # legacy expiry
# LOGIN dev (portal) → 1 Set-Cookie: ... Max-Age=28800; HttpOnly; SameSite=Lax   (no Secure, no Domain)
# LOGOUT prod → 2 Set-Cookie đều Max-Age=0 (host-only + Domain=.hrpartner.vn); dev → 1 (host-only, Max-Age=0)
```

Đã grep xác nhận KHÔNG có token/secret literal trong HANDOFF (chỉ placeholder + tên biến).

## 6. Inventory diff (AC-12)

### 6.1 In-scope — do task này tạo/sửa (9 file)

Tracked (M) — 7:
- `middleware.ts` — bỏ role→subdomain; nhánh legacy-host 308; giữ auth/fence/rate-limit/x-request-id.
- `app/api/auth/login/route.ts` — `redirectTo` relative; cookie host-only + legacy expiry (prod).
- `app/api/auth/logout/route.ts` — xoá cookie host-only + legacy (prod).
- `app/login/page.tsx` — bỏ subtitle-theo-subdomain.
- `app/login/login-form.tsx` — `sanitizeCallbackPath` precedence.
- `src/domains/security/portal-domains.integration.test.ts` — viết lại dùng helper thật.
- `src/domains/security/security-matrix-portals.test.ts` — landing path per role.

Untracked (??) — 2 (mine):
- `src/shared/routing/portal-landing.ts` — source-of-truth helper (mới).
- `src/domains/security/single-domain-consolidation.test.ts` — suite mới (18).

`git diff --name-only` = ĐÚNG 7 tracked; KHÔNG lẫn file M1-08 hay config test.

### 6.2 Out-of-scope untracked — CÓ SẴN từ trước, KHÔNG chạm (6)

`docs/HRP_REMAINING_ROADMAP.md`, `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, `scratch/run_m1_06b_audit.ps1`, `scratch/run_m1_06c_audit.ps1`, `scripts/debug-parser.mjs`.

> `docs/tasks/…/HANDOFF.md` (file này) là deliverable Tier 2 hợp lệ. Không có `.env*`, secret, `AUDIT.md`, hay artifact agent khác trong diff.

## 7. AC-08 — Inventory literal `hrpartner.vn` trong scope (`app` `src` `middleware.ts`, *.ts/*.tsx)

Công cụ: Grep harness (engine ripgrep), pattern `hrpartner\.vn`, glob `**/*.{ts,tsx}`.

| Loại | Vị trí | Phán định |
|---|---|---|
| ✅ Allowlist legacy (live, RQ-08) | `src/shared/routing/portal-landing.ts:73-76` (`vendor./worker./ctv.hrpartner.vn` → landing) | HỢP LỆ — nguồn 308 duy nhất, map về canonical, KHÔNG phải target subdomain sống |
| ✅ Hằng canonical | `portal-landing.ts:20-21` (`https://hrpartner.vn`, `hrpartner.vn`) | HỢP LỆ — origin đích cố định |
| ✅ Legacy cookie DELETION | `login/route.ts:96`, `logout/route.ts:26` (`Domain=.hrpartner.vn` + `Max-Age=0`) | HỢP LỆ — DEC-03 xoá cookie cũ, KHÔNG set subdomain sống |
| ✅ Comment/doc | `middleware.ts:4,6,200`; `portal-landing.ts:85`; comments trong login/logout | Vô hại — giải thích, không phải routing |
| ✅ Test fixture | `single-domain-consolidation.test.ts`, `portal-domains.integration.test.ts` | Mong đợi — assertion hành vi |
| ✅ Email (không phải routing) | `app/(portal)/ve-chung-toi/page.tsx:208` (`contact@`), `src/shared/push/trigger.ts:13` (`admin@`) | Vô hại — địa chỉ email domain gốc, không liên quan subdomain |
| ⚠️ Comment cũ, NGOÀI SCOPE | `src/shared/ui/role-guard/role-guard-layout.tsx:9` (`Vendor Portal (vendor.hrpartner.vn)`) | Comment tài liệu cũ, KHÔNG điều hướng. File ngoài scope task → **KHÔNG sửa**; đề xuất doc-cleanup follow-up |

**Kết luận AC-08:** KHÔNG có bất kỳ literal subdomain nào được dùng làm **runtime navigation / role-mapping target**. Nơi duy nhất 3 subdomain xuất hiện dưới dạng giá trị sống là allowlist chuyển-tiếp `portal-landing.ts` (→ canonical). Đạt AC-08. Ghi chú: các match ngoài `*.ts/*.tsx` (`prisma/seed.mjs`, `ve-hrp.html`, `.tmp_plan_index.txt`) nằm ngoài scope `app src middleware.ts` được TASK chỉ định.

## 8. Runbook OP (RQ-09/AC-09) — KHÔNG chứa secret; chỉ tên biến

Tier 2 CHỈ cung cấp runbook; KHÔNG tự thực hiện DNS/Vercel/env/deploy. Thứ tự bắt buộc:

1. **Preview verify** — Deploy code lên preview (KHÔNG production). Xác nhận build xanh, middleware active. Không đổi env production ở bước này.
2. **Root smoke** — Trên preview, kiểm thủ công: `GET /` (200), login 3 portal role → landing `/vendor` `/worker` `/ctv`; login internal role → `/bcc`/callback; logout xoá cookie; `/api/vendor` unauth → 401; `/bcc` fence còn nguyên. Xác nhận cookie `Set-Cookie` host-only (không `Domain=`) trên preview.
3. **Attach canonical** — Gắn `hrpartner.vn` làm primary domain của project trên Vercel; xác nhận cert cấp xong, `GET https://hrpartner.vn/` khỏe. (Chưa đụng subdomain.)
4. **Legacy redirect (giữ alias)** — GIỮ 3 domain `vendor./worker./ctv.hrpartner.vn` gắn vào cùng project để middleware phát 308 về canonical (đã có sẵn trong code). KIỂM: `https://vendor.hrpartner.vn/` → 308 → `https://hrpartner.vn/vendor`; path/query preserved. Bật cờ production để login/logout phát thêm lệnh xoá cookie `Domain=.hrpartner.vn` (đã code sẵn, kích hoạt qua `NODE_ENV=production`).
5. **Monitoring** — Theo dõi 2–4 tuần (Q-02): tỉ lệ 308 từ 3 legacy host giảm dần; lỗi 401/redirect-loop = 0; đối chiếu `x-request-id` trong log. Không tháo domain khi lưu lượng legacy còn đáng kể.
6. **Remove DNS** — Khi lưu lượng legacy ~0: gỡ 3 subdomain khỏi project + xoá bản ghi DNS subdomain. Canonical `hrpartner.vn` là origin duy nhất còn lại.

**Rollback:** mỗi bước độc lập & đảo ngược được — gỡ canonical primary / tái gắn alias / tắt `NODE_ENV=production`-scoped cookie deletion. Không thao tác phá huỷ dữ liệu.

**Secrets:** runbook KHÔNG in giá trị env. Biến liên quan chỉ nêu TÊN: `NODE_ENV` (cờ prod cookie). KHÔNG đọc/echo `docs/VERCEL_ENV_PRODUCTION.local.md`.

## 9. G0 DEBT (ĐÃ RESOLVE bởi Tier 1 — BLK-01/DEC-11) — `npx vitest run` literal exit 1

> Round 1 tôi dừng BLOCKED tại đây và chuyển Tier 1 quyết. Tier 1 đã phán quyết ở execution round 1 (§9.4): **ACCEPT_FIX** — chốt canonical gate là `npm run test:unit`, phân loại `npx vitest run` literal là G0 infrastructure debt, mở task riêng G0-04b, KHÔNG block go-live-01. Round 2 chỉ xác nhận lại bằng chứng (9.1–9.3 vẫn đúng) và áp dụng phán quyết.

### 9.1 Hiện tượng (vẫn tái hiện ở round 2 — đã phân loại debt)
`npx vitest run` (default `vitest.config.ts`) → **exit 1**:
`Test Files 1 failed | 82 passed | 10 skipped (93)` · `Tests 24 failed | 1250 passed | 245 skipped (1519)`.
File fail DUY NHẤT: `src/domains/applications/placement-panel.test.ts` (24/26) — lỗi `React is not defined`. Theo DEC-11 đây KHÔNG phải quality gate của repo → ghi riêng, KHÔNG kể PASS, KHÔNG block.

### 9.2 Bằng chứng đây KHÔNG phải regression của task (REAL)
- `git diff --name-only` = ĐÚNG 7 file in-scope; `placement-panel.test.ts` **KHÔNG** có trong diff.
- KHÔNG file config test (`vitest.config.ts`, `vitest.unit.config.ts`) nào nằm trong diff của tôi.
- `git cat-file -e 2cd8a55:src/domains/applications/placement-panel.test.ts` → **EXISTS at baseline**. `git merge-base --is-ancestor 299614a 2cd8a55` → YES (commit tạo file — `299614a feat(mp3)` — là tổ tiên của baseline). ⇒ file đã **tồn tại từ TRƯỚC baseline M1-08**, độc lập hoàn toàn với task này.
- Cùng file **PASS** dưới `npm run test:unit` (exit 0, 1187 pass) và `npm run build` exit 0.

### 9.3 Root cause (một dòng config)
`vitest.config.ts` (default, dùng bởi `npx vitest run`/`npm test`) THIẾU `esbuild: { jsx: 'automatic' }`. `vitest.unit.config.ts:23` (lane CI `npm run test:unit`) CÓ `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }` kèm comment: *"Without this, esbuild uses the classic runtime and component tests fail with 'React is not defined'."* Component test MP-3C (React 19 automatic JSX) vì vậy chỉ pass ở lane unit. Đây là khác biệt hạ tầng test, không liên quan routing.

### 9.4 Phán quyết Tier 1 — BLK-01 (execution round 1): ACCEPT_FIX
Round 1 tôi để Tier 1 quyết (Iron Rule 2: Tier 2 KHÔNG self-audit). Tier 1 chọn phương án khép hợp đồng:
- **DEC-11 (Final):** blocking full-unit gate của repo là `npm run test:unit` (`vitest.unit.config.ts` — automatic JSX + ép DB về unreachable sentinel, fail-closed), KHÔNG phải raw `npx vitest run` (default config thiếu automatic JSX VÀ còn đọc ambient/repo `.env` → không phải lane fail-closed hợp lệ để quyết định task).
- **Contract v1.1:** AC-11 + mandatory command chuyển sang `npm run test:unit`; raw default runner được ghi riêng, không kể thành PASS nhưng KHÔNG block task.
- **Closure BLK-01:** *"Tier 2 round 2 rerun verify-task + `npm run test:unit`, cập nhật HANDOFF thành READY_FOR_AUDIT; không sửa source nếu không có regression."* → chính là round 2 này.

### 9.5 Follow-up — PLN-FOLLOWUP-01 (DEFER → task G0-04b)
Khác biệt JSX + DB-URL giữa `vitest.config.ts` và `vitest.unit.config.ts` = **G0 test-runner safety/parity debt, KHÔNG phải routing defect**. Tier 1 mở task riêng **G0-04b** để đồng bộ 2 lane; KHÔNG block go-live-01 khi canonical fail-closed lane PASS. Task go-live-01 KHÔNG chạm file config test (ngoài allowlist).

### 9.6 Trạng thái sau resolve
Điều kiện READY_FOR_AUDIT (round 2) đã đủ: verify-task exit 0, canonical gate `npm run test:unit` exit 0 (1187/1187), tsc/eslint/build/`git diff --check` exit 0; `npx vitest run` literal đã phân loại G0 debt (§9.1–9.3), ghi riêng, không block. KHÔNG sửa source (không có regression mới). Không còn hạng mục in-scope dang dở.

---

## 10. Trạng thái & tự đánh giá trung thực

- In-scope: **HOÀN TẤT**. TẤT CẢ AC-01..AC-12 đạt (AC-11 MET theo v1.1: canonical gate `npm run test:unit` + tsc + scoped lint + build + `git diff --check` exit 0; raw `npx vitest run` literal ghi riêng là G0 debt, không PASS/không block — §5, §9).
- Blocker round 1 đã được Tier 1 giải quyết (BLK-01 ACCEPT_FIX + DEC-11; follow-up PLN-FOLLOWUP-01 DEFER → G0-04b). Round 2 rerun verify-task + `npm run test:unit` (PASS 1187/1187), KHÔNG sửa source (không có regression mới).
- KHÔNG self-audit, KHÔNG tuyên accepted, KHÔNG sửa TASK/AUDIT/CLAUDE, KHÔNG commit/push/deploy/DNS/env. Evidence toàn bộ REAL (§4). Token/secret đã mask.

**Handoff status: READY_FOR_AUDIT**









