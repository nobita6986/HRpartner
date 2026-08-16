# HANDOFF: hrp-phase1-bcc-fence

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-phase1-bcc-fence` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0 (chưa audit)` |
| Executor | `Tier 2 — Implementation Engineer` |
| Baseline | `f382c8d` (TASK) — actual start state: `main fa6c5b1` (HEAD trước khi tôi commit) |
| Status | `BLOCKED` (STEP-01..08 hoàn tất; STEP-09 chờ ENV production) |
| Started/updated | `2026-08-16 14:45 / 15:20 ICT` |

## 1. Outcome Summary

- Rào toàn bộ `/bcc` bằng `middleware.ts` (matcher `/bcc/:path*`, fail-closed): page không token → 307 redirect `/login?callback=...`; không render dữ liệu. KHÔNG sửa bất kỳ file nào trong `app/bcc/` — `git diff app/bcc/` rỗng (AC-07 PASS).
- Login phone + password (zod, bcryptjs, jose JWT HS256 8h, cookie `hrp_token` httpOnly + SameSite=Lax + Secure ở production), logout xóa cookie, `GET /api/me` trả đúng `{ userId, role }` (DoD PHASE_KHOAHOC §4).
- Seed idempotent thêm 2 tài khoản auth (ADMIN + HR_MANAGER) từ ENV — upsert theo `phone`, KHÔNG reset passwordHash tài khoản đã tồn tại, thiếu ENV → skip + cảnh báo.
- Verify local trọn bộ trên **Neon dev branch** (`DATABASE_URL_DEV`, pattern giống Phase 0 — KHÔNG đụng Neon main): `npm run test` 55/55 pass (10/10 lần liên tiếp ổn định sau khi sửa 1 flaky test), `npm run build` exit 0, curl matrix T1–T9 + isActive=false đều đúng kỳ vọng.
- Commit `5851b5b` (16 file, 650 insertions, prefix `feat(auth):` — theo ủy quyền Planner).
- STEP-09 (deploy production + seed production + curl production) CHƯA làm — chờ Planner cung cấp 5 ENV production qua Vercel dashboard.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-09` | `package.json`, `package-lock.json` | `DONE` — cài `jose@6.2.9` + `bcryptjs@3.0.3` (DEC-06), `npm ls` xác nhận không có dependency ngoài danh sách | None |
| `STEP-02` | `RQ-03` | `src/shared/auth/jwt.ts`, `password.ts`, `user.ts` + 3 test file | `DONE` — sign/verify jose HS256 (ENV JWT_SECRET ≥32, exp 8h); bcrypt hash/verify; đọc token từ cookie `hrp_token` + Bearer; 14 unit test pass | Sửa 1 flaky test (mutate ký tự cuối token → mutate ký tự giữa signature — chi tiết DEV-05) |
| `STEP-03` | `RQ-01`, `RQ-07` | `middleware.ts` (mới, gốc repo) | `DONE` — matcher `/bcc/:path*`; verify qua `getAuthUser`; page → 307 `/login?callback=...`, `/api/` → 401 JSON; fail-closed; không đụng `app/bcc/*` | None |
| `STEP-04` | `RQ-02`, `RQ-08` | `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts` | `DONE` — login: zod `{phone, password}`, findFirst theo phone + `isActive` + `passwordHash`, bcrypt compare, sign JWT, Set-Cookie `hrp_token` httpOnly/SameSite=Lax/path=/Max-Age 8h; sai → 401 message chung; logout: xóa cookie (Max-Age 0) | DEV-01: `Secure` chỉ bật ở production (dev http không test được nếu Secure — TASK đã cho phép ghi deviation) |
| `STEP-05` | `RQ-04` | `app/api/me/route.ts` | `DONE` — không token → 401 JSON; hợp lệ → 200 `{ userId, role }` (không thêm trường nào) | None |
| `STEP-06` | `RQ-02` | `app/login/page.tsx`, `app/login/login-form.tsx` | `DONE` — form Warm Professionalism (tokens globals.css: `--primary #F26522`, `--background #FAF9F7`, Be Vietnam Pro); lỗi chung "Sai số điện thoại hoặc mật khẩu"; redirect callback/`/bcc`; không lưu password URL/localStorage; `Suspense` cho `useSearchParams` | None |
| `STEP-07` | `RQ-05` | `prisma/seed.mjs`, `.env.example` (mới) | `DONE` — seed 2 lần trên dev branch: 12→14 users (2 created), 14→14 (0 created, 2 updated — password giữ nguyên), exit 0; chỉ chạm bảng `users`; `.env.example` chỉ tên biến (0 dòng có giá trị) | DEV-02: chạy seed/verify trên Neon dev branch thay vì main (RISK-02) — production seed thuộc STEP-09 |
| `STEP-08` | `RQ-09` | Local verify trọn bộ | `DONE` — `npm run test` 55/55 (10/10 lần), `npm run build` exit 0, curl matrix T1–T9 + isActive=false PASS (chi tiết §3) | None |
| `STEP-09` | `RQ-01` | Deploy Vercel production + ENV + seed production | `BLOCKED` — chờ Planner cung cấp 5 ENV production (`JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, `HR_PHONE`, `HR_PASSWORD`) qua Vercel dashboard; KHÔNG tự deploy khi chưa có lệnh | BLK-01 |
| `STEP-10` | — | `docs/tasks/hrp-phase1-bcc-fence/HANDOFF.md` | `DONE` | None |

## 3. Acceptance Evidence

Môi trường evidence local: dev server `next dev` port 3100, `DATABASE_URL` = Neon dev branch (`DATABASE_URL_DEV`), auth user seeded từ ENV local. Output nhạy cảm (token/password) đã mask. Toàn bộ command chạy qua `node` fetch/`curl` — raw log: `%TEMP%\hrp-curl-matrix.log` (local, không commit).

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` | `GET /bcc` không token (fetch redirect: manual) | `PASS` local | `status: 307` + `location: /login?callback=%2Fbcc` — không render dữ liệu | Production chưa chạy (STEP-09) |
| `AC-02` | `POST /api/auth/login` 3 case: sai mật khẩu / đúng / isActive=false | `PASS` local | sai → `401 {"error":"INVALID_CREDENTIALS","message":"Sai số điện thoại hoặc mật khẩu"}`; đúng → `200` + `Set-Cookie: hrp_token=<masked>; Max-Age=28800; HttpOnly; SameSite=lax` + `{"ok":true}`; isActive=false → `401` (test tạm tắt/bật trên dev branch, đã restore `isActive=true`) | Production chưa chạy |
| `AC-03` | Tampered token + expired token: unit test + HTTP | `PASS` | curl: Bearer sửa 1 ký tự → `401`; expired token (exp -1s, ký bằng cùng secret) → `401`; unit test `jwt.test.ts`: 7 test (giả mạo, hết hạn, thiếu role, sai secret, thiếu/short secret) — không crash/500 | None |
| `AC-04` | `GET /api/me` 2 case | `PASS` local | không token → `401 {"error":"UNAUTHORIZED",...}`; Bearer hợp lệ → `200 {"userId":"2f1bd9d4-...","role":"ADMIN"}` — đúng 2 trường, không PII | Production chưa chạy |
| `AC-05` | Seed 2 lần + count + login | `PASS` (dev branch) | Lần 1: users `12 → 14` ("2 created"), lần 2: `14 → 14` ("0 created, 2 updated"), cả 2 exit 0; login bằng password sau lần seed 2 → `200` (password cũ không đổi) | Chạy trên dev branch (DEV-02); production seed = STEP-09 |
| `AC-06` | Grep credential | `PASS` | `JWT_SECRET`/`ADMIN_PASSWORD`/`HR_PASSWORD` với giá trị literal trong source: **0 match** (chỉ `process.env.*`); `.env.example` 0 dòng có giá trị (chỉ tên biến); `hrp_token` value hardcode: 0 match | 2 match trong `jwt.test.ts` là test fixtures cố ý sai (`'too-short'`, `'another-secret-...'`) — không phải credential thật (DEV-03); `placeholder="0912345678"` là số ảo (DEV-04) |
| `AC-07` | `git diff --stat app/bcc/` | `PASS` | Output rỗng — kiểm tra trước và sau commit `5851b5b` | None |
| `AC-08` | `npm run test` + `npm run build` | `PASS` | `npm run test`: 6 files, **55/55 passed** — chạy 10 lần liên tiếp đều pass sau khi sửa flaky (DEV-05); `npm run build`: exit 0 (route đủ: `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/me`, Middleware 39.3 kB) | None |
| `AC-09` | Logout flow | `PASS` local | `POST /api/auth/logout` (có cookie) → `200` + `Set-Cookie: hrp_token=; Max-Age=0`; sau logout, request KHÔNG cookie → `/api/me` `401` | Stateless JWT: token cũ tự giữ vẫn verify qua header (TASK §4.3 đã ghi nhận — không server-side revocation, LIM-01) |
| `AC-10` | E2E production | `BLOCKED` | — | Chờ STEP-09 (BLK-01) |

## 4. Changed Deliverables

- **Source/artifact changed:** `middleware.ts` (mới), `app/login/page.tsx` + `app/login/login-form.tsx` (mới), `app/api/auth/login/route.ts` + `app/api/auth/logout/route.ts` (mới), `app/api/me/route.ts` (mới), `src/shared/auth/jwt.ts` + `password.ts` + `user.ts` + 3 test file (mới), `prisma/seed.mjs` (bổ sung seed auth accounts), `package.json` + `package-lock.json`, `.env.example` (mới — chỉ tên biến).
- **Dependency:** `jose@6.2.9`, `bcryptjs@3.0.3` (DEC-06 — không cài gì khác).
- **Schema/migration:** None — không tạo migration (EV-04: User + SystemRole đã đủ).
- **Environment/config:** Tên biến mới trong `.env.example`: `JWT_SECRET`, `ADMIN_PHONE`, `ADMIN_PASSWORD`, `HR_PHONE`, `HR_PASSWORD` (không giá trị). `.env` local (gitignored) đã thêm giá trị dev ngẫu nhiên — không in ra.
- **Git diff/commit:** commit `5851b5b` — `feat(auth): rao /bcc bang JWT - login phone+password, middleware fail-closed, /api/me, seed 2 tai khoan tu ENV (STEP-01..08 phase1-bcc-fence)` (16 files, 650 insertions). KHÔNG stage `.env`, KHÔNG stage `appBCC/agent_mapper.py` + `appBCC/app.py` (sếp đang sửa dở).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | Deviation | Cookie `hrp_token` set `secure: NODE_ENV === 'production'` — dev (http) không Secure để trình duyệt/curl test được | Production vẫn Secure (DEC-03 giữ nguyên); local dev lệch 1 thuộc tính — TASK mục "Lưu ý kỹ thuật" cho phép | Ghi nhận; không cần hành động |
| `DEV-02` | Deviation | Seed + toàn bộ verify local chạy trên **Neon dev branch** (`DATABASE_URL_DEV`) — không chạm Neon main (RISK-02; pattern giống Phase 0 HANDOFF) | Evidence local đúng với cùng schema/code path; production chưa có evidence → STEP-09 bắt buộc | Ghi nhận; STEP-09 sẽ seed production với ENV thật |
| `DEV-03` | Deviation (test fixture) | `jwt.test.ts` chứa 2 literal `'too-short'`, `'another-secret-32chars-min-99999999'` — giá trị test cố ý SAI để chứng minh fail-closed | Không phải credential production; AC-06 vẫn PASS (không có secret thật trong source) | Ghi nhận |
| `DEV-04` | Deviation (UI) | `placeholder="0912345678"` trong form login — số ảo minh họa | Không phải PII thật | Ghi nhận |
| `DEV-05` | Fix flaky test | Test "token giả mạo" mutate ký tự CUỐI token: base64url không padding, ký tự cuối có bit thừa — đổi char có thể decode ra cùng bytes → verify thành công (~1/64 lần, tái lập 2 lần trong 10+ chạy). Đã sửa: mutate ký tự GIỮA segment signature (bytes đổi chắc chắn) → 10/10 chạy liên tiếp pass | Suite ổn định; bài học ghi trong comment test | Ghi nhận |
| `LIM-01` | Limitation | JWT stateless: sau logout, token cũ nếu giữ lại vẫn verify được qua `Authorization` header (browser flow xóa cookie → 401, đã verify T7b) | TASK §4.3 ghi nhận sẵn: không server-side revocation tuần đầu | Đã chốt trong contract — không cần hành động |
| `BLK-01` | Blocker | STEP-09 cần 5 ENV production (`JWT_SECRET` ≥32 ký tự + `ADMIN_PHONE`/`ADMIN_PASSWORD`/`HR_PHONE`/`HR_PASSWORD`) do sếp/Planner cấp qua Vercel dashboard | Chưa deploy production; `/bcc` production VẪN mở như trước (rủi ro pre-task còn đó) | Planner cung cấp ENV + lệnh deploy thì tôi chạy STEP-09 (seed production + curl production + verify AC-01/02/04/10 production) |

## 6. Evidence Index

Output ngắn để ở §3. Raw log matrix: `%TEMP%\hrp-curl-matrix.log` (local, chứa cookie token — không commit).

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `%TEMP%\hrp-curl-matrix.log` | AC-01..04, AC-09 curl matrix (token đã mask) |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `BLOCKED` (STEP-01..08 DONE) | Code xong + verify local xong trên dev branch; chờ Planner cấp ENV production để chạy STEP-09 |

> Handoff status: BLOCKED — chờ Planner cung cấp giá trị ENV production (5 biến) để chạy STEP-09
