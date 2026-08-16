# TASK: hrp-phase1-bcc-fence

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase1-bcc-fence` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `ACCEPTED` — Tier 3 PASS round 2 + Planner nghiệm thu 16/08 |
| Planner | Tier 1 — Planner / Product & Architecture Decision Owner |
| Executor | Tier 2 — **bên ngoài, do sếp giao** (Cursor/agent khác — Tier 1 KHÔNG spawn Tier 2/3; quy ước 16/08) |
| Auditor | Tier 3 — **bên ngoài, do sếp giao** (độc lập với Tier 2) |
| Baseline | `f382c8d` (main 16/08/2026 — Phase 0 ACCEPTED) |
| Modules | Phase 1 Identity (tuần 1) — chạm: `middleware.ts` (mới), `app/login/*` (mới), `app/api/auth/*` + `app/api/me/*` (mới), `src/shared/auth/*` (mới), `prisma/seed.mjs`, `package.json` |
| ADR references | **D15** (DECISION_LOG — rào /bcc JWT tối giản tuần đầu Phase 1, trước permission-resolver); **ADR-007** (JWT + passwordHash argon2/bcrypt); `docs/PHASE_KHOAHOC_V1.md` §4 Phase 1 DoD (2 mục đầu: `/api/me` + 401 không 500); `docs/CONTRACT_BCC.md` §6 (quy tắc PII); `docs/data-scope-security.md` §15.1 (ADMIN = root) |
| Current execution round | 2 |
| Current audit round | 2 — PASS |
| Next gate | ACCEPTED — mở task kế tiếp `hrp-phase1-identity-core` |
| Updated | 2026-08-16 16:55 ICT |

## 1. Outcome

### User-visible outcome

- Mở `https://hrpartner.vn/bcc` khi **chưa đăng nhập** → bị chuyển hướng về trang `/login`, **không** thấy dữ liệu công/lương.
- Đăng nhập bằng **số điện thoại + mật khẩu** (tài khoản được sếp cấp) → vào `/bcc` xem dữ liệu **y hệt như cũ** (UI/data không đổi).
- Token hết hạn (8h) → phải đăng nhập lại.
- Người ngoài không có tài khoản **không thể** xem công/lương thật nữa — đóng lỗ hổng PII công khai.

### Non-goals

- KHÔNG permission-catalog / permission-resolver 13 role / `with-auth-scope` — thuộc task `hrp-phase1-identity-core` (tuần 2).
- KHÔNG rào `/api/tickets/*` (vẫn stub dev `session.ts` — dữ liệu demo, rủi ro tạm chấp nhận; xử lý ở task identity-core).
- KHÔNG RLS / field masking (Phase 2).
- KHÔNG magic link / OAuth.
- KHÔNG thêm cột hoặc bảng DB mới (User/Permission đã đủ — schema.prisma:125-197).
- KHÔNG UNIQUE constraint `portal_timesheets` (CONTRACT_BCC §10 — task identity-core).
- KHÔNG đổi logic `app/bcc/*` — khu vực sếp đang phát triển song song.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `app/bcc/page.tsx:58-80` + `app/bcc/actions.ts:30-80` | `/bcc` công khai 100%: gõ mã NV → đọc `portalTimesheet` (công + `payrollData` lương thật) qua `getPrisma()`, không auth | Cần rào toàn bộ route `/bcc` trước khi render/query |
| `EV-02` | Glob `middleware.ts` | Không có middleware nào trong repo | Phải tạo mới `middleware.ts` (Next 15.1.3 App Router) |
| `EV-03` | `src/domains/attendance/session.ts:5-9` | Stub auth "role tự khai từ header" cho 6 route `/api/tickets/*`; code tự ghi "KHÔNG được deploy production" | Out of scope task này nhưng **cấm** mở rộng dùng stub cho `/bcc` |
| `EV-04` | `prisma/schema.prisma:125-150` | `User` có `phone` (String?), `passwordHash`, `role` (SystemRole 13 giá trị, schema:105-119), `isActive` | Không cần migration — login dùng `phone` làm identifier, bcrypt verify, kiểm tra `isActive` |
| `EV-05` | `package.json` | Next 15.1.3; chưa có `jose`, chưa có `bcrypt`/`bcryptjs`; vitest 2.1.8 | Cần cài 2 dependency mới (đã duyệt: DEC-06) |
| `EV-06` | `prisma/schema.prisma:1028-1046` | `PortalTimesheet` đang chứa dữ liệu thật (appBCC bơm vào Neon main) | Seed chỉ được upsert bảng `users`, không đụng bảng khác |
| `EV-07` | `docs/PHASE_KHOAHOC_V1.md` §4 | DoD Phase 1: `curl -H "Authorization: Bearer <JWT>" /api/me` → `{ userId, role }`; không JWT → 401 (không 500) | AC-04 khóa đúng 2 mục DoD này ngay từ task 1 |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Login = **phone + password**. `phone` làm identifier (User.phone có sẵn, không cần migration); password hash **bcrypt** (ADR-007 cho phép argon2/bcrypt) | Sếp chốt 16/08 qua AskUserQuestion | CHỐT |
| `DEC-02` | CHOSEN | JWT HS256, verify bằng **`jose`** (PHASE_KHOAHOC §4 DoD). Claims tối thiểu: `sub` (userId), `role` (SystemRole), `exp`. Secret: ENV `JWT_SECRET` (≥32 ký tự). Token sống **8 giờ**. TUYỆT ĐỐI không nhận role/identity từ header tự khai | Planner | CHỐT |
| `DEC-03` | CHOSEN | Vận chuyển token: cookie **httpOnly + Secure + SameSite=Lax**, path `/`, tên `hrp_token` (browser `/bcc` + `/login`); middleware đọc **cả cookie lẫn** `Authorization: Bearer` (hỗ trợ curl/API — đúng DoD PHASE_KHOAHOC) | Planner | CHỐT |
| `DEC-04` | CHOSEN | Rào bằng Next.js **middleware** (matcher `/bcc/:path*`; `/login` public; API không token → **401 JSON**, page → redirect `/login?callback=...`). Fail-closed: lỗi verify = chặn, không pass-through | Planner | CHỐT |
| `DEC-05` | CHOSEN | Seed idempotent **2 tài khoản**: sếp (**ADMIN**) + 1 HR (**HR_MANAGER**). Phone + password lấy từ ENV `ADMIN_PHONE`, `ADMIN_PASSWORD`, `HR_PHONE`, `HR_PASSWORD` — KHÔNG hardcode, KHÔNG ghi PII vào repo/chat. Upsert theo `phone`; tài khoản đã tồn tại → **không reset password**. Thiếu ENV lúc seed → skip tài khoản đó + log cảnh báo (không crash) | Sếp chốt 2 tài khoản 16/08; cách triển khai Planner | CHỐT |
| `DEC-06` | CHOSEN | Dependency mới được duyệt: **`jose`** + **`bcryptjs`** (tránh native build trên Windows/Vercel — RISK-04). Tier 2 KHÔNG tự ý cài thêm dependency khác | Planner | CHỐT |
| `DEC-07` | CHOSEN | `/login` là page tĩnh mới `app/login/page.tsx` (form phone + password, submit → `POST /api/auth/login` → set cookie → redirect `/bcc`; lỗi hiển thị chung "Sai số điện thoại hoặc mật khẩu" — không lộ tài khoản tồn tại hay không). KHÔNG sửa file nào trong `app/bcc/` | Planner | CHỐT |
| `DEC-08` | CHOSEN | Endpoint mới: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me` (trả `{ userId, role }`). `/api/me` là chuẩn đầu tiên của Phase 1, tái dùng ở task identity-core | Planner | CHỐT |
| `DEC-09` | ASSUMPTION | Task này chỉ cần mức "đã xác thực" — mọi tài khoản hợp lệ đều xem được `/bcc`; phân quyền chi tiết thuộc task identity-core, data scope thuộc Phase 2 | Planner | Hết hiệu lực khi task identity-core PASS |
| `DEC-10` | ASSUMPTION | `User.isActive = false` → login bị từ chối (kiểm tra khi login) | Planner | — |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Mọi request vào `/bcc` không có token hợp lệ bị chặn trước khi render/query: page → redirect `/login`; API/action → 401 JSON | Must | D15 + EV-01/02 | Không trả dữ liệu; 307/302 hoặc 401 |
| `RQ-02` | `POST /api/auth/login` nhận `{ phone, password }`: đúng + isActive → JWT + set cookie `hrp_token`; sai/khóa → 401 JSON `{ error }`, message chung không lộ chi tiết | Must | DEC-01/10 | 401, không 500 |
| `RQ-03` | JWT verify bằng `jose` + ENV `JWT_SECRET`; token giả mạo/sai chữ ký/hết hạn → 401, không crash | Must | DEC-02 | 401 JSON |
| `RQ-04` | `GET /api/me`: không token → 401; token hợp lệ → 200 `{ userId, role }` (đúng DoD PHASE_KHOAHOC §4) | Must | EV-07/DEC-08 | 401 / 200 |
| `RQ-05` | Seed 2 tài khoản (ADMIN + HR_MANAGER) từ ENV, idempotent (upsert theo `phone`), bcrypt hash, không reset password tài khoản đã tồn tại, thiếu ENV → skip + cảnh báo | Must | DEC-05 | Không tạo trùng; không mất password cũ |
| `RQ-06` | KHÔNG hardcode secret/token/password trong code/repo; KHÔNG log token/password; `.env.example` chỉ thêm **tên biến**, không giá trị | Must | 00-global-rules §3 | Audit fail nếu grep thấy credential |
| `RQ-07` | KHÔNG đổi logic/data của `app/bcc/*` (khu vực sếp phát triển song song) — git diff `app/bcc/` phải rỗng | Must | EV-03 + lệnh sếp | Không được có diff |
| `RQ-08` | `POST /api/auth/logout` xóa cookie → request sau không còn được xác thực | Must | DEC-03/08 | Sau logout, `/api/me` → 401 |
| `RQ-09` | Test auth helper bằng vitest (sign/verify, token giả, login sai); `npm run test` + `npm run build` exit 0 | Must | EV-05 | Test fail = không bàn giao |

### 4.2 Scope boundaries

**In scope:**

- `middleware.ts` (mới, gốc repo)
- `app/login/page.tsx` (mới)
- `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts` (mới)
- `app/api/me/route.ts` (mới)
- `src/shared/auth/` (mới — jwt helper, password helper, đọc user từ request)
- `prisma/seed.mjs` (bổ sung seed 2 tài khoản — giữ idempotent như hiện tại)
- `package.json` + lockfile (thêm `jose`, `bcryptjs`)
- `.env.example` (thêm tên biến: `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, `HR_PHONE`, `HR_PASSWORD`)

**Out of scope:**

- `app/bcc/*`, `app/api/tickets/*`, `src/domains/attendance/session.ts`
- `src/shared/auth/permission-*`, `with-auth-scope` (task identity-core)
- Bất kỳ migration Prisma nào (không cần thiết — EV-04)
- RLS, field masking, refresh token, multi-device session, rate limit login

### 4.3 Data, State, Permission và Interface Rules

- **Data:** chỉ đọc bảng `users` (User). JWT payload chỉ chứa `sub`, `role`, `exp` — không nhét phone/name/PII vào token. Không đọc/ghi bảng `portal_timesheets` hay bảng khác ngoài luồng sẵn có.
- **State:** phiên là stateless JWT; logout = xóa cookie phía client; **không** server-side revocation (ghi nhận giới hạn tuần đầu, nâng cấp ở task sau).
- **Permission/data scope:** deny-by-default — không token = không truy cập. Đã xác thực (role bất kỳ trong SystemRole) = được vào `/bcc` (DEC-09).
- **Interface:** `/login` = form đơn giản theo design system Warm Professionalism (`#F26522` primary, Be Vietnam Pro, nền `#FAF9F7`); nhãn "Số điện thoại", "Mật khẩu", nút "Đăng nhập". UI `/bcc` giữ nguyên 100%.
- **Failure/idempotency/concurrency:** login sai → 401 JSON; seed upsert idempotent (re-run an toàn); middleware fail-closed; không `catch` rỗng — mọi lỗi phải log hoặc trả về rõ ràng (00-global-rules §3).

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-09` | `package.json` | Cài `jose` + `bcryptjs` (chỉ 2 dependency đã duyệt DEC-06) | npm | `npm ls jose bcryptjs` | Không cài thêm dependency ngoài danh sách |
| `STEP-02` | `RQ-03` | `src/shared/auth/jwt.ts`, `src/shared/auth/password.ts` + test | Helper sign/verify JWT (jose HS256, ENV `JWT_SECRET`, exp 8h) + hash/verify bcrypt; unit test vitest (token giả mạo → reject, hết hạn → reject) | EV-05 | `npm run test` | Helper không đọc role/identity từ header tự khai |
| `STEP-03` | `RQ-01`, `RQ-07` | `middleware.ts` | Matcher `/bcc/:path*`; đọc cookie `hrp_token` + Bearer; verify → next, không hợp lệ → page: redirect `/login?callback=...`, API: 401 JSON. Không sửa file `app/bcc/*` | Next 15 middleware | curl local `/bcc` không token → 3xx về `/login`; `/api/me` → 401 | Nếu phải sửa `app/bcc/*` để rào → dừng, báo BLOCKED |
| `STEP-04` | `RQ-02`, `RQ-08` | `app/api/auth/login/route.ts`, `logout/route.ts` | Login: validate `{phone, password}` (zod), lookup `users` theo phone + isActive, bcrypt compare, sign JWT, set cookie httpOnly+Secure+SameSite=Lax; logout: xóa cookie. Message lỗi chung, không lộ chi tiết | STEP-02 | curl login đúng → 200 + Set-Cookie; sai → 401 | Không log password/token dưới mọi hình thức |
| `STEP-05` | `RQ-04` | `app/api/me/route.ts` | 401 khi không token; 200 `{ userId, role }` khi hợp lệ | STEP-02/03 | curl `/api/me` 2 trường hợp | Không trả thêm trường PII ngoài userId/role |
| `STEP-06` | `RQ-02` | `app/login/page.tsx` | Form phone + password (Warm Professionalism), submit → login → redirect về callback/`/bcc`; hiển thị lỗi chung | STEP-04 | Mở `/login` local, nhập sai → thấy lỗi | Không lưu password vào state URL/localStorage |
| `STEP-07` | `RQ-05` | `prisma/seed.mjs` | Bổ sung seed 2 user (ADMIN + HR_MANAGER) từ ENV, upsert theo `phone`, bcrypt hash, không reset password nếu tồn tại, thiếu ENV → skip + cảnh báo | EV-04/06 | Chạy seed 2 lần → count users không đổi; verify bằng query Prisma (KHÔNG in hash) | Cấm đụng bảng khác ngoài `users`; cấm xóa row |
| `STEP-08` | `RQ-09` | Local verify trọn bộ | `npm run test` + `npm run build` exit 0; curl matrix local: `/api/me` 401/200, login sai 401, `/bcc` redirect | STEP-02→07 | Command + exit code + output | Test fail hoặc build fail → sửa, không bàn giao |
| `STEP-09` | `RQ-01` | Deploy Vercel production | Set ENV production (`JWT_SECRET` + 4 biến tài khoản — sếp/Planner cung cấp qua Vercel dashboard, KHÔNG qua chat); chạy seed production; curl production: `/api/me` không token → 401, login → 200 + cookie, mở `/bcc` có cookie → 200 | STEP-08 | Evidence: command + exit code + output (mask password) | ENV chưa set đủ → KHÔNG deploy; cấm in giá trị ENV |
| `STEP-10` | — | `docs/tasks/hrp-phase1-bcc-fence/HANDOFF.md` | Ghi HANDOFF theo template: đã làm, evidence từng AC, deviation (nếu có) | template HANDOFF | Tier 1 đọc | Kết thúc bằng `Handoff status: READY_FOR_AUDIT` hoặc `BLOCKED` |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Mở `/bcc` không token → redirect `/login` (3xx, location chứa `/login`); KHÔNG render dữ liệu | curl production + trình duyệt | Command + status code + location header | Yes |
| `AC-02` | `RQ-02` | Login đúng → 200 + `Set-Cookie: hrp_token=...; HttpOnly`; sai mật khẩu → 401; tài khoản isActive=false → 401 | curl production (phone/password từ ENV, output mask password) | Command + exit + output đã mask | Yes |
| `AC-03` | `RQ-03` | Token bị sửa 1 ký tự → `/api/me` 401; token hết hạn (exp đã qua) → 401; không crash/500 | curl + unit test vitest | Output curl + test result | Yes |
| `AC-04` | `RQ-04` | `/api/me` không token → 401 JSON; có token → 200 `{"userId": "...", "role": "ADMIN"}` | curl production | Command + output | Yes |
| `AC-05` | `RQ-05` | Chạy seed 2 lần liên tiếp → không tạo user trùng; password user đã tồn tại không đổi (đăng nhập vẫn OK bằng password cũ) | Chạy seed 2 lần + query count + login | Command + count trước/sau + login OK | Yes |
| `AC-06` | `RQ-06` | grep toàn repo: không có giá trị `JWT_SECRET`/password trong source (chỉ `process.env.*`); `.env.example` chỉ có tên biến | grep | Grep pattern + kết quả (0 match với giá trị) | Yes |
| `AC-07` | `RQ-07` | `git diff --stat` thư mục `app/bcc/` rỗng | git diff | Output rỗng | Yes |
| `AC-08` | `RQ-09` | `npm run test` pass (vitest) + `npm run build` exit 0 | Local + CI | Command + exit code + output | Yes |
| `AC-09` | `RQ-08` | POST logout → cookie xóa → `/api/me` 401 | curl | Command + output | Yes |
| `AC-10` | `RQ-01..09` | E2E thật production: mở `/bcc` chưa login → về `/login`; đăng nhập → `/bcc` hiển thị dữ liệu như trước rào (UI + data không đổi) | Trình duyệt + curl sequence | Mô tả bước + output curl/screenshot | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-03`, `STEP-09` | `AC-01`, `AC-10` |
| `RQ-02` | `STEP-04`, `STEP-06` | `AC-02`, `AC-10` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-05` | `AC-04` |
| `RQ-05` | `STEP-07` | `AC-05` |
| `RQ-06` | `STEP-02`, `STEP-04`, `STEP-07` | `AC-06` |
| `RQ-07` | `STEP-03`, `STEP-09` | `AC-07` |
| `RQ-08` | `STEP-04` | `AC-09` |
| `RQ-09` | `STEP-01`, `STEP-02`, `STEP-08` | `AC-08` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Rào fail-closed chặn luôn sếp (ENV chưa set khi deploy) | Deploy trước khi set ENV production | STEP-09: kiểm tra đủ 5 ENV **trước** khi deploy; test ngay sau deploy | Vercel instant rollback về `f382c8d` — `/bcc` trở lại trạng thái cũ (chấp nhận như pre-task) |
| `RISK-02` | Seed chạm dữ liệu thật Neon main | Chạy seed nhầm DB production | Seed chỉ upsert `users`, không đụng bảng khác; verify `DATABASE_URL` trước khi chạy; count trước/sau | Add-only nên không cần restore; nếu lỗi → sửa script, chạy lại (idempotent) |
| `RISK-03` | Xung đột với khu vực sếp đang sửa song song (`appBCC/`, `app/bcc/`) | Build fail hoặc diff `app/bcc/` | Không sửa file `app/bcc/*`; middleware/route hoàn toàn file mới | Nếu conflict → BLOCKED, báo sếp quyết |
| `RISK-04` | `bcrypt` native build lỗi trên Windows/Vercel | npm install fail | DEC-06: dùng `bcryptjs` (pure JS) | — |
| `RISK-05` | Token 8h hết hạn giữa giờ làm | `exp` qua | Chấp nhận tuần đầu: đăng nhập lại; refresh token thuộc task sau | Đăng nhập lại |
| `RISK-06` | Login bị brute-force (không rate limit — ngoài scope) | Nhiều request 401 | Message lỗi chung; rate limit thuộc task identity-core | Tạm chấp nhận tuần đầu (rủi ro thấp hơn lỗ hổng hiện tại) |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None — mọi NEED_USER_DECISION đã chốt 16/08 (DEC-01..05) | — | — | No |

## 9. Planner Resolution

Tier 1 append quyết định sau audit; không sửa lịch sử finding.

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 2 | None | ACCEPT_FIX | Tier 3 verdict PASS: 10/10 AC verified on production `https://hrpartner.vn`; no findings; HANDOFF round 2 `READY_FOR_AUDIT`; AUDIT round 2 confirms `/bcc` redirect 307 without token, login 200 + HttpOnly cookie, `/api/me` 200 with JWT/401 without, logout clears cookie, `app/bcc/` diff rỗng, test 55/55 PASS. Planner accepts closure. | Status → `ACCEPTED`; current execution/audit round updated; no product contract change. | Closed by Planner 2026-08-16 — next task `hrp-phase1-identity-core` |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | 2026-08-16 | Khởi tạo contract — rào `/bcc` JWT tối giản tuần đầu Phase 1 (D15): login phone+password, jose JWT 8h, cookie httpOnly + Bearer, middleware fail-closed, seed 2 tài khoản idempotent từ ENV, `/api/me` theo DoD PHASE_KHOAHOC §4 | Lệnh sếp vào Phase 1 16/08 + D15 + PHASE_KHOAHOC_V1 §4 |
| `v1.1` | 2026-08-16 | **Đổi quy trình giao việc** — Executor/Auditor là Tier 2/3 bên ngoài do sếp giao (Cursor/agent khác), Tier 1 KHÔNG spawn sub-agent đảm nhiệm Tier 2/3. Ghi nhận tiến độ: STEP-01..08 đã xong (commit `5851b5b` + HANDOFF `a0123fd`, `1993f7d`); **STEP-09 chưa chạy** — production sạch (chỉ có `DATABASE_URL` cũ, chưa set 5 ENV mới, chưa seed Neon main, chưa deploy). `.gitignore` đang có thay đổi chưa commit (thêm `.vercel/`). Giá trị 4 biến tài khoản do sếp cấp TRỰC TIẾP cho Tier 2 ngoài | Lệnh sếp 16/08 — Tier 1 chỉ đảm nhiệm Tier 1 |
| `v1.1-close` | 2026-08-16 | `/resolve` sau AUDIT round 2 PASS: cập nhật Control status `ACCEPTED`, execution round 2, audit round 2 PASS; Planner Resolution ghi nhận no findings + 10/10 AC PASS production. Không đổi contract sản phẩm | AUDIT.md round 2 verdict PASS |
