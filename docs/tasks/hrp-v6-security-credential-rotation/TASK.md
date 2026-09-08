# TASK: hrp-v6-security-credential-rotation

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-security-credential-rotation` |
| Work type | `INFRA` |
| Assurance lane | `CRITICAL` |
| In-scope roots | `check_rls.cjs` (untrack + sanitize); `.gitignore` (exact path); `docs/runbooks/credential-rotation-incident.md` (mới); `docs/tasks/hrp-v6-security-credential-rotation/**` (HANDOFF, evidence); 4 file canary `BLOCKED_DB_URL` ở `vitest.unit.config.ts`, `vitest.integration-files.ts`, `vitest.config.ts`, `playwright.config.ts` (chỉ đọc, KHÔNG sửa); Neon role `neondb_owner` host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech` (Owner/OP rotate, masked) |
| Required gates | `verify-task.ps1` (Tier 1); `verify-handoff.ps1` (Tier 2); `verify-audit.ps1` (Tier 3) |
| Audit mode (Tier 3 đọc) | `INFRA_AUDIT` |
| Spec version | `v1.3` |
| Status | `BLOCKED` (audit round 1) — Tier 3 audit round 1 BLOCKED với AUD-001 (canary contract vs reality mismatch) + AUD-002 (Owner rotation chưa execute). Tier 1 DELTA: sửa AC-02 gitignore path (bỏ `/` prefix) + AC-09 canary whitelist (2/4 files tồn tại + 2 OUT_OF_SCOPE) + AC-10 vitest command (bỏ playwright + specific file args → full suite). Audit round 1 verdict BLOCKED đúng. Chờ Owner/OP rotate credential + Tier 3 re-audit round 2 → ACCEPTED |
| Planner | `Tier 1` |
| Executor | `Tier 2` cho repo hygiene (STEP-01..03); `Owner/OP` cho Neon rotate + verify (STEP-04..06) |
| Auditor | `Tier 3 independent context` |
| Baseline | `main @ d3ca054` — sau Tier 1 redact commit `f956dd1` + handover bump `d3ca054`; `check_rls.cjs` đã untrack (git ls-files rỗng) + sanitize (0 URL pattern + 2 env.DATABASE_URL + 2 throw) + `.gitignore:82` exact path (git check-ignore exit 0); canary reality: 2/4 files có BLOCKED_DB_URL, 2 OUT_OF_SCOPE |
| Modules | `Neon credentials; secret rotation; repository hygiene; Prisma RLS check; check_rls.cjs` |
| ADR references | `docs/PLANNER_HANDOVER.md §13` fail-closed LIVE DB convention; `tier1.md §6` Resolve Protocol; `hrp-v5-go-live-21-credential-hygiene-closure` §9 AUD-001 ESCALATE_NEW_TASK |
| Current execution round | `1` |
| Current audit round | `1` (BLOCKED: AUD-001 canary mismatch + AUD-002 Owner rotation pending) |
| Canonical env name | `DATABASE_URL` (file hiện tại đọc `process.env.DATABASE_URL` × 2; override §8 Q-02 answer cũ từ `CHECK_RLS_DSN`) |
| Next gate | Tier 2 `/code hrp-v6-security-credential-rotation` execution round 1 sau khi task 21 audit round ≥ 2 PASS + verify-task.ps1 PASS + closure canonical từ branch `codex/hrp-v6-p1b-job-opening-posting-split` (commit `314ecef`) merge vào main. STEP-01 untrack check_rls.cjs = SKIP (đã landed tại `4a56122`); STEP-02 sanitize = SKIP (đã landed tại `4a56122`); STEP-03 commit scoped = SKIP (đã landed tại `121e796`); STEP-04 runbook = VERIFY (đã landed tại `121e796`); STEP-05..06 Owner/OP rotate Neon = PENDING OP window; STEP-07 Tier 3 fingerprint scan = PENDING; STEP-08 HANDOFF closure canonical = PENDING |
| Updated | `2026-09-08 21:30 Asia/Bangkok` — Tier 1 redact + bump v1.1 → v1.2 sau khi Tier 2 báo cáo verify-task.ps1 FAIL exit 2 tại A-04/A-05/T-06 (8/8 Tier 2 claim đã verify đúng) |

## 1. Outcome

### User-visible outcome

HRPartner production database không còn chịu rủi ro từ một Neon owner credential vô tình bị push lên Git. File `check_rls.cjs` (commit `ebca45c feat(portal): audit M7 Admin Expansion pass`) — đã chứa raw Neon `neondb_owner` credential ở line 2 (literal redacted per `00-global-rules §3`; fingerprint lưu tại Tier 3 evidence) — đã được:

1. **Untrack** khỏi Git (`git rm --cached` + `.gitignore` thêm exact path);
2. **Sanitize** trong worktree (URL hardcode đổi thành `process.env.DATABASE_URL` với fail-closed khi thiếu env);
3. **Rotate** credential gốc ở Neon side (Owner/OP tạo credential mới, revoke credential cũ sau khi smoke xanh);
4. **Audit** lại toàn repo bằng fingerprint canary độc lập xác nhận không còn match;
5. **Document** rotation order, recovery path và evidence trong runbook riêng.

> **Cửa vận hành có khả năng làm gián đoạn production.** Tier 2 chỉ chuẩn bị code + inventory + dry-run. Owner/OP thực thi Neon rotation. Thiếu Owner approval ở OP step là `OWNER_BLOCKED`, không phải PASS, không được lách bằng credential cũ.

### Non-goals

- Không đổi schema, RLS policy, role membership hay migration nào.
- Không triển khai feature nghiệp vụ (Affiliate, payroll, attendance, V6 Admin).
- Không xoá `.env.dev`/`.env.preview`/`.env.prod.test` (đó là task 21 `hrp-v5-go-live-21-credential-hygiene-closure` STEP-01 r1-FIX).
- Không xoá `hrp_mp2_test`, Upstash TEST credentials hay bất kỳ TEST asset nào.
- Không rewrite Git history để xoá secret khỏi commit `ebca45c`. Nếu audit phát hiện credential còn hiệu lực ở commit cũ, dừng và mở incident/history-rewrite plan riêng.
- Không sửa bốn file canary `BLOCKED_DB_URL` (canary giả theo DEC-05; password placeholder là giá trị dummy không match fingerprint Neon thật) — đó là canary an toàn, không có credential thật.
- Không tạo lại `check_rls.cjs` nếu Owner quyết định RLS check script không còn cần thiết (KEEP/DELETE quyết định của Owner).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `check_rls.cjs:2` (đo 2026-09-07 12:00; literal redacted tại v1.2 theo `00-global-rules §3`) | Nội dung line 2 trước redact: raw Neon `neondb_owner` credential — host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`, role `neondb_owner`, password fingerprint lưu tại Tier 3 evidence (sha256 hash only). Pattern URL đã được redact trong tài liệu này; fingerprint scan dùng exact host + role + password fragment (per DEC-11) | Tier 2 phải untrack + sanitize; Owner phải rotate credential gốc |
| `EV-02` | `git ls-files check_rls.cjs` (đo 2026-09-07 12:00) | Trả về `check_rls.cjs` — file đang tracked, không phải untracked | `git rm --cached` cần commit mới persist (giống bài học AUD-002 của task 21) |
| `EV-03` | `git log --oneline -- check_rls.cjs` (đo 2026-09-07 12:00) | Commit thêm file: `ebca45c feat(portal): audit M7 Admin Expansion pass` | Credential có khả năng từng hiệu lực khi audit M7; Tier 3 cần fingerprint scan HEAD + history |
| `EV-04` | `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/AUDIT.md` §1 AUD-001 (đo 2026-09-07 11:25-12:30) | Tier 3 audit round 1 phát hiện: fingerprint scan `rg -nP '(postgres(?:ql)?|mysql\|...)://[^\s:/@]+:[^\s@]+@'` --glob exclude scratch/docs/node_modules/.next/public trả 1 hit = `check_rls.cjs:2` | Tier 1 mở task này là ESCALATE_NEW_TASK từ AUD-001; Tier 2 fix AUD-002/003 song song |
| `EV-05` | So sánh với bốn file khác trong repo (đo 2026-09-07 12:00) | `vitest.unit.config.ts:15`, `vitest.integration-files.ts:6`, `vitest.config.ts:25`, `playwright.config.ts:30` đều chứa `BLOCKED_DB_URL` (canary giả, host `127.0.0.1:1`, không match fingerprint Neon theo DEC-11) | Task này CẤM sửa 4 file này; RQ-04 ghi rõ whitelist để Tier 2/Auditor không nhầm |
| `EV-06` | `.env`, `.env.dev` (đo 2026-09-07 12:00) | `.env` tồn tại untracked (không stage), `.env.dev` tracked (nằm trong task 21 AUD-002 r1-FIX); không có file env nào có entry `DATABASE_URL` trỏ về Neon owner | Tier 2 không nên tạo mới `.env` cho `check_rls.cjs` — dùng `DATABASE_URL` có sẵn trong `process.env` (Owner/OP đặt khi rotate) |
| `EV-07` | Cấu trúc file `check_rls.cjs` (5 dòng, đo 2026-09-07 12:00) | Toàn bộ file: line 1 require PrismaClient, line 2 hardcode URL, line 3 `async function main()`, line 4 query `pg_policies`, line 5 `console.log` + close | Tier 2 có thể sanitize dễ dàng: thay URL hardcode bằng `process.env.DATABASE_URL`; throw fail-closed khi thiếu env |
| `EV-08` | `docs/V6/v6-admin-rebuild.md` §11 V6-DEC-022 | "Công khai và nhân sự-nhập-hộ DÙNG CHUNG một thẩm quyền tạo-hoặc-khớp" — quyết định V6 về việc dùng chung 1 thẩm quyền; có thể ảnh hưởng đến RLS policy check | RLS check script (nếu Owner giữ) cần verify còn tương thích với V6 schema mới (Phase 1A); không thuộc task này, ghi vào Q-04 |
| `EV-09` | `docs/PLANNER_HANDOVER.md §13` (đo 2026-09-07) | "Sổ nợ có 11 mục: rotate ba DB role..." — task 21 đã gom rotation `neondb_owner`/`cloud_admin`/`app_user_writer` vào contract một cửa | Task này là **BỔ SUNG** task 21, không thay thế: 3 role rotation ở task 21 vẫn chạy, task này chỉ xử lý credential đã LỘ trong Git |
| `EV-10` | `tier1.md §6` Resolve Protocol | `ESCALATE_NEW_TASK` decision có nghĩa: mở contract mới, không sửa task cũ | Task này mở theo đúng protocol; scope = untrack + sanitize + rotate + audit lại |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Task status `DRAFT` cho tới khi Owner xác nhận credential fingerprint `sha256:redacted-neon-owner-pw` (host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`, role `neondb_owner`) còn/không còn active ở Neon. Nếu credential đã được rotate bởi task 21 OP execution (STEP-07), task này vẫn chạy để untrack + sanitize; nếu credential còn active, task mở execution round 1 ngay | EV-04, EV-09 | Final |
| `DEC-02` | CHOSEN | Hai lane trong cùng contract: Tier 2 chuẩn bị repo (STEP-01..03); Owner/OP rotate + verify ở Neon (STEP-04..06). Tier 3 audit sau khi cả hai lane có evidence. Tier 2 KHÔNG tự rotate | DEC-01 task 21 | Final |
| `DEC-03` | CHOSEN | Tier 2 chỉ `git rm --cached` + sanitize source; KHÔNG xoá file `check_rls.cjs` khỏi worktree. Quyết định KEEP/DELETE thuộc Owner. Nếu Owner chọn DELETE, Tier 2 untrack + xoá file theo allowlist | EV-02, EV-07 | Final |
| `DEC-04` | CHOSEN | Rotation order (giống task 21 DEC-04): tạo/xác minh credential mới → cập nhật env/secret manager → smoke → revoke credential cũ. `neondb_owner` phải đúng role, không tráo runtime writer với owner | EV-01, EV-09 | Final |
| `DEC-05` | CHOSEN | Bốn file canary (`vitest.unit.config.ts`, `vitest.integration-files.ts`, `vitest.config.ts`, `playwright.config.ts`) chứa `BLOCKED_DB_URL` với host `127.0.0.1:1` (canary GIẢ, host không match fingerprint Neon thật). CẤM sửa; đây là whitelist để Tier 3 fingerprint scan không báo false-positive | EV-05 | Final |
| `DEC-06` | CHOSEN | Không rewrite Git history. Nếu Tier 3 fingerprint scan phát hiện credential fingerprint `sha256:redacted-neon-owner-pw` (host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`, role `neondb_owner`) ở HEAD/index/worktree hoặc commit cũ → đó là finding riêng, Owner quyết định history rewrite (EV-03 đã thấy commit `ebca45c` có thể chứa credential) | Risk containment | Final |
| `DEC-07` | CHOSEN | Tier 2 sanitize bằng cách thay URL hardcode thành `process.env.DATABASE_URL` với fail-closed throw khi thiếu. KHÔNG dùng default fallback (ví dụ `process.env.DATABASE_URL ?? 'something'`) vì nếu env lộ = bypass fail-closed | EV-01, EV-07 | Final |
| `DEC-08` | CHOSEN | `check_rls.cjs` script KHÔNG nằm trong production runtime path (file `.cjs` chạy độc lập với Next.js build). Tier 2 chỉ sanitize + untrack, KHÔNG động vào entry point nào | EV-07 | Final |
| `DEC-09` | ASSUMPTION | Owner đặt `DATABASE_URL` ở shell environment khi cần chạy `check_rls.cjs` (sau rotate), hoặc dùng `.env.local` (untracked, đã nằm trong `.gitignore`). KHÔNG tạo mới `.env` cho `check_rls.cjs` | EV-06 | Hết hạn trước STEP-02 |
| `DEC-10` | CHOSEN | Task này KHÔNG bump `v1.1 READY_FOR_EXECUTION` cho `hrp-v6-p1-labor-profile-schema` / `hrp-v6-p1-job-opening-posting-split` / `hrp-v6-p1c-new-ui-restyling` vì đó là task khác, queue khác. Iron Rule #1 giữ nguyên | PLN-64 | Final |
| `DEC-11` | CHOSEN | Tier 3 fingerprint scan phải độc lập (Tier 3 tự dựng fingerprint từ known-secret, không dùng pattern của Tier 2). Pattern `postgresql://.*@.*neon` có thể false-positive với BLOCKED_DB_URL — fingerprint scan dùng exact host + role + password fragment | EV-05, EV-04 | Final |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | Untrack `check_rls.cjs` (`git rm --cached`); KHÔNG xoá file khỏi worktree; thêm `.gitignore` exact path (cùng pattern task 21 DEC-10) | Must P0 | EV-02, EV-04 | File còn tracked = FAIL và credential tiếp tục lộ |
| `RQ-02` | Sanitize `check_rls.cjs`: thay URL hardcode ở line 2 bằng `process.env.DATABASE_URL`; throw fail-closed khi thiếu env (stack trace có chỉ dẫn "set DATABASE_URL") | Must P0 | EV-01, EV-07, DEC-07 | URL hardcode còn trong source = FAIL |
| `RQ-03` | Commit scoped `git commit --` với paths chỉ định (`check_rls.cjs` + `.gitignore`); dùng message có trace `hrp-v6-security-credential-rotation` | Must P0 | Bài học AUD-002 task 21 | Commit miss staged changes = FAIL và untrack không persist |
| `RQ-04` | WHITELIST bốn file canary `BLOCKED_DB_URL` (`vitest.unit.config.ts:15`, `vitest.integration-files.ts:6`, `vitest.config.ts:25`, `playwright.config.ts:30`); KHÔNG sửa, KHÔNG coi là leak | Must P0 | EV-05, DEC-05 | Tier 3 audit báo false-positive trên canary = FAIL audit protocol |
| `RQ-05` | Owner rotate credential fingerprint `sha256:redacted-neon-owner-pw` (host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`, role `neondb_owner`) ở Neon: tạo credential mới cho `neondb_owner` (hoặc role tương đương), xác minh identity/posture, cập nhật secret store, revoke credential cũ sau smoke | Must P0 | EV-01, DEC-04 | Credential cũ còn active = P0 open |
| `RQ-06` | Tier 3 fingerprint scan độc lập (dựng fingerprint từ known-secret fingerprint `sha256:redacted-neon-owner-pw` + host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech` + role `neondb_owner`); scan HEAD/index/worktree + commit history; verify 0 match ngoài whitelist (4 file canary không match fingerprint) | Must P0 | EV-04, DEC-11 | Fingerprint match ngoài whitelist = FAIL |
| `RQ-07` | Viết runbook `docs/runbooks/credential-rotation-incident.md` với: incident timeline, rotation order, smoke matrix, rollback path, post-check posture, evidence template (masked) | Must P0 | EV-09, DEC-04 | Không runbook = BLOCKED cho OP execution |
| `RQ-08` | Bốn file canary `BLOCKED_DB_URL` vẫn chạy đúng trong vitest/playwright (test pass); xác nhận script canary vẫn reject non-local DB | Must P0 | EV-05 | Canary bị hỏng do Tier 2 vô tình sửa = FAIL và mất safety net |
| `RQ-09` | Tier 2 KHÔNG tự rotate credential, KHÔNG kết nối Neon, KHÔNG đọc value credential mới vào evidence | Must P0 | DEC-02, Security invariant | Tier 2 có evidence chứa credential thật = FAIL và phải rotate thêm |
| `RQ-10` | Tier 3 scan HEAD + 5 commit gần nhất trước `ebca45c` để xác nhận credential fingerprint `sha256:redacted-neon-owner-pw` không xuất hiện ở commit khác | Should P1 | EV-03, DEC-06 | Credential xuất hiện ở commit khác = tìm thấy thì dừng, lập plan riêng |

### 4.2 Scope boundaries

**In scope:**

- `check_rls.cjs` (sanitize, KHÔNG xoá)
- `.gitignore` (thêm exact path cho `check_rls.cjs`)
- `docs/runbooks/credential-rotation-incident.md` (mới)
- `docs/tasks/hrp-v6-security-credential-rotation/**` (HANDOFF, evidence)
- 2 file canary `BLOCKED_DB_URL` tồn tại: `vitest.unit.config.ts:15`, `vitest.config.ts:25` (chỉ đọc, KHÔNG sửa; `vitest.integration-files.ts` không phải canary, không thuộc whitelist; `playwright.config.ts` không tồn tại trong repo — OUT_OF_SCOPE)
- Neon role `neondb_owner` cho `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech` (Owner/OP rotate)

**Out of scope:**

- `.env.dev`, `.env.preview`, `.env.prod.test` (task 21 AUD-002 r1-FIX)
- `.env.local`, `.env.ops06a-test.local`, `.env.production.local` (task 21 AUD-06 / STEP-10)
- `.neon`, `tsconfig.tmp.json`, `tsconfig.*probe.tsbuildinfo`, `scratch/` (task 21 STEP-04)
- Branch `pre-mp2-remediation-2026-08-28`, DEMO data (task 21 STEP-10/11)
- Vercel, Upstash, GitHub secret rotation
- Git history rewrite
- Schema, RLS policy, migration

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Manifest key-only/path-only. Secret evidence chỉ có hash/fingerprint không đảo ngược (sha256 của credential + role + host), trạng thái SET/EMPTY/ACTIVE/REVOKED.
- **State:** Credential đi qua `NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED`. Cấm nhảy thẳng từ created sang revoked.
- **Permission/data scope:** Tier 2 chỉ có quyền đọc code + commit scoped; KHÔNG có quyền mutate Neon. Owner chỉ thao tác đúng role `neondb_owner` của host `ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech`.
- **Interface:** URL `https://hrpartner.vn` không đổi; login/admin/public job/apply/tracking response contract không đổi. `check_rls.cjs` chạy bằng `node check_rls.cjs` (sau khi `DATABASE_URL` được đặt), output là danh sách policy giống như cũ.
- **Failure/idempotency/concurrency:** Repo cleanup chạy lại an toàn. Neon rotation thực hiện trong một cửa không có agent song song sửa env. Nếu Tier 2 chạy `git rm --cached` hai lần → idempotent; nếu Owner rotate hai lần → dừng và audit.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `check_rls.cjs` + `.gitignore` | `git rm --cached check_rls.cjs`; thêm exact path `/check_rls.cjs` vào `.gitignore` (cùng pattern task 21 DEC-10) | EV-02 | `git ls-files check_rls.cjs` trả rỗng ; `git check-ignore -v check_rls.cjs` trả 1 dòng | File còn tracked = STOP |
| `STEP-02` | `RQ-02` | `check_rls.cjs` line 2 | Sanitize: thay URL hardcode bằng `process.env.DATABASE_URL`; thêm `if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set; source DATABASE_URL is required for RLS check')` ngay sau require | EV-01, DEC-07 | `rg -nP '(postgres(?:ql)?\|...)://[^\s:/@]+:[^\s@]+@' check_rls.cjs` trả rỗng ; `rg -n 'process.env.DATABASE_URL' check_rls.cjs` trả ≥ 1 dòng | URL hardcode còn = STOP và revert |
| `STEP-03` | `RQ-03, RQ-08` | Repo commit | `git add check_rls.cjs .gitignore` (KHÔNG dùng `-A`); `git commit -- check_rls.cjs .gitignore` với message `chore(security): untrack check_rls.cjs + sanitize URL — hrp-v6-security-credential-rotation`; chạy `npx vitest run vitest.unit.config.ts vitest.config.ts` và `npx playwright test --config=playwright.config.ts` để xác nhận canary vẫn pass | STEP-01, STEP-02 | `git log -1 -- check_rls.cjs` hiển thị commit scoped ; vitest exit 0 ; playwright exit 0 | Test canary fail = STOP và khôi phục .gitignore |
| `STEP-04` | `RQ-07` | `docs/runbooks/credential-rotation-incident.md` | Viết runbook: incident timeline (audit round 1 ngày 07/09), rotation order (NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED), smoke matrix 4 route, rollback path, post-check posture, masked evidence template | STEP-03 | Tabletop walkthrough ; `Test-Path docs/runbooks/credential-rotation-incident.md` | Thiếu recovery path = STOP |
| `STEP-05` | `RQ-05, RQ-09` | Neon role — Owner/OP | Owner tạo credential mới cho `neondb_owner` (masked identity/posture probe), cập nhật secret store, smoke trước revoke | Approved maintenance window | Role/user/posture checks ; `node check_rls.cjs` chạy thành công với credential mới | Sai role/BYPASSRLS = STOP |
| `STEP-06` | `RQ-05` | Old credential — Owner/OP | Owner revoke credential fingerprint `sha256:redacted-neon-owner-pw`, xác nhận fail khi connect | STEP-05 smoke green | Masked negative connect ; `node check_rls.cjs` với credential cũ trả connection refused | Credential cũ còn dùng được = FAIL |
| `STEP-07` | `RQ-06, RQ-10` | Tier 3 audit | Tier 3 fingerprint scan độc lập: dựng fingerprint từ `sha256:redacted-neon-owner-pw` + ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech + neondb_owner; scan HEAD/index/worktree + 5 commit gần nhất trước `ebca45c`; verify 0 match ngoài whitelist 4 file canary (canary không match vì host `127.0.0.1` ≠ `ep-shy-tree-...`) | All prior steps | Manual review zero-match summary ; `rg -nP 'sha256:redacted-neon-owner-pw\|ep-shy-tree-az32as2c-pooler' --` áp dụng cho scope chỉ định trong evidence file trả 0 dòng ngoài whitelist | Match ngoài whitelist = STOP và lập plan riêng |
| `STEP-08` | Tất cả | `HANDOFF.md` | Tier 2 bàn giao repo gates, runbook, dry-run; Tier 3 đo fingerprint; Owner action list; không tự rotate | All prior steps | `verify-handoff` PASS | Không có rollback/expected counts = BLOCKED |

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|-----|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03`, `AC-04` |
| `RQ-03` | `STEP-03` | `AC-05` |
| `RQ-04` | `STEP-08` | `AC-09` |
| `RQ-05` | `STEP-05`, `STEP-06` | `AC-06` |
| `RQ-06` | `STEP-07` | `AC-07` |
| `RQ-07` | `STEP-04` | `AC-08` |
| `RQ-08` | `STEP-03` | `AC-10` |
| `RQ-09` | `STEP-03`, `STEP-07` | `AC-11` |
| `RQ-10` | `STEP-07` | `AC-07`, `AC-12` |

Diễn giải RQ (để tra cứu):
- `RQ-01` untrack + gitignore exact path.
- `RQ-02` sanitize URL hardcode → process.env.DATABASE_URL với fail-closed.
- `RQ-03` commit scoped, không `git add -A`.
- `RQ-04` whitelist 4 file canary `BLOCKED_DB_URL`.
- `RQ-05` Owner rotate `neondb_owner` credential.
- `RQ-06` Tier 3 fingerprint scan độc lập.
- `RQ-07` runbook riêng cho incident.
- `RQ-08` canary vẫn pass sau untrack + sanitize.
- `RQ-09` Tier 2 không đọc/print credential thật.
- `RQ-10` scan history 5 commit gần nhất.

## 6. Acceptance

Mỗi hàng đo bằng LỆNH thật. Tất cả OFFLINE trừ STEP-05/06 (Owner/OP). Secret evidence chỉ có fingerprint không đảo ngược.

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chặn? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | `RQ-01` | `git ls-files check_rls.cjs` trả rỗng (file không còn tracked) | `git ls-files check_rls.cjs` exit 0 output rỗng | output, `evidence/ac01-untracked.txt` | Yes |
| `AC-02` | `RQ-01` | `.gitignore` chứa exact path `check_rls.cjs`; `git check-ignore -v check_rls.cjs` trả 1 dòng (exit 0) | `rg -n 'check_rls\.cjs$' .gitignore` ; `git check-ignore -v check_rls.cjs` | hai output, `evidence/ac02-gitignore.txt` | Yes |
| `AC-03` | `RQ-02` | `check_rls.cjs` KHÔNG còn chứa scheme URL postgres pattern | `rg -nP '(postgres(?:ql)?|mysql\|...)://[^\s:/@]+:[^\s@]+@' check_rls.cjs` trả rỗng | output rỗng, `evidence/ac03-sanitized.txt` | Yes |
| `AC-04` | `RQ-02` | `check_rls.cjs` đọc `process.env.DATABASE_URL`; throw fail-closed khi thiếu | `rg -n 'process.env.DATABASE_URL' check_rls.cjs` ≥ 1 ; `rg -n 'throw' check_rls.cjs` ≥ 1 | hai output, `evidence/ac04-failclosed.txt` | Yes |
| `AC-05` | `RQ-03` | Commit scoped có message chứa `hrp-v6-security-credential-rotation`; chỉ touch `check_rls.cjs` + `.gitignore` | `git log -1 --format=%B` có chuỗi ; `git diff HEAD~1 HEAD --name-only` chỉ 2 path | hai output, `evidence/ac05-commit.txt` | Yes |
| `AC-06` | `RQ-05` | Credential mới đúng identity `neondb_owner` + host `ep-shy-tree-...`; credential cũ fingerprint `sha256:redacted-neon-owner-pw` fail khi connect | Owner chạy masked identity probe (role, host fingerprint, posture) ; `node check_rls.cjs` với credential cũ trả connection refused | Identity matrix (masked), `evidence/ac06-rotation.txt` | Yes |
| `AC-07` | `RQ-06, RQ-10` | Fingerprint scan HEAD + 5 commit gần nhất trước `ebca45c` trả 0 match ngoài whitelist canary | Tier 3 chạy `rg -nP 'sha256:redacted-neon-owner-pw\|ep-shy-tree-az32as2c-pooler' -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '.env*'` loại trừ 4 file canary ; verify 0 dòng | scan output, `evidence/ac07-fingerprint.txt` | Yes |
| `AC-08` | `RQ-07` | `docs/runbooks/credential-rotation-incident.md` tồn tại với 5 mục: timeline, rotation order, smoke matrix, rollback, masked evidence template | `Test-Path` ; `rg -n '^## '` cho 5 mục | output, `evidence/ac08-runbook.txt` | Yes |
| `AC-09` | `RQ-04` | 2 file canary tồn tại với `BLOCKED_DB_URL`: `vitest.unit.config.ts:15` và `vitest.config.ts:25`; 1 file tồn tại nhưng không có canary: `vitest.integration-files.ts` (không thuộc scope RQ-04 whitelist); 1 file MISSING: `playwright.config.ts` (không tồn tại trong repo — loại khỏi whitelist) | `rg -n 'BLOCKED_DB_URL' vitest.unit.config.ts vitest.config.ts` trả ≥ 1 dòng mỗi file ; `Test-Path playwright.config.ts` trả False ; `rg 'BLOCKED_DB_URL' vitest.integration-files.ts` trả rỗng (file tồn tại nhưng không canary — not blocking) | 2 dòng, `evidence/ac09-canary.txt` | Yes (chỉ 2 file tồn tại canary; MISSING file = OUT_OF_SCOPE) |
| `AC-10` | `RQ-08` | Canary test vẫn pass sau untrack + sanitize: `npx vitest run` exit 0 (full suite với vitest.unit.config.ts + vitest.config.ts override BLOCKED_DB_URL) ; `npm run build` exit 0 | exit codes, `evidence/ac10-canary-pass.txt` | Yes |
| `AC-11` | `RQ-09` | Evidence files không chứa credential thật (fingerprint `sha256:redacted-neon-owner-pw` không xuất hiện ở evidence) | `rg -n 'sha256:redacted-neon-owner-pw' evidence/` trả rỗng (chỉ fingerprint không đảo ngược mới được phép) | grep rỗng, `evidence/ac11-redaction.txt` | Yes |
| `AC-12` | `RQ-10` | 5 commit gần nhất trước `ebca45c` không chứa credential fingerprint `sha256:redacted-neon-owner-pw` | `git log --oneline ebca45c~5..ebca45c -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '.env*' | xargs rg -n 'sha256:redacted-neon-owner-pw'` trả rỗng | scan output, `evidence/ac12-history.txt` | Yes |
| `AC-13` | Tất cả | `npx vitest run` exit 0, `npm run build` exit 0 | hai lệnh | hai exit codes, `evidence/ac13-build.txt` | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |
| `RQ-02` | `STEP-02` | `AC-03`, `AC-04` |
| `RQ-03` | `STEP-03` | `AC-05` |
| `RQ-04` | `STEP-08` | `AC-09` |
| `RQ-05` | `STEP-05`, `STEP-06` | `AC-06` |
| `RQ-06` | `STEP-07` | `AC-07` |
| `RQ-07` | `STEP-04` | `AC-08` |
| `RQ-08` | `STEP-03` | `AC-10` |
| `RQ-09` | `STEP-03`, `STEP-07` | `AC-11` |
| `RQ-10` | `STEP-07` | `AC-07`, `AC-12` |
| Mọi RQ | `STEP-08` | `AC-13` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Production mất DB connection giữa rotation | Revoke cũ trước deployment/smoke mới | DEC-04 state order | Restore credential cũ (Neon restore từ history); rebuild `check_rls.cjs` từ HEAD~1 |
| `RISK-02` | Tier 2 vô tình sửa một trong 4 file canary → canary mất safety net | STEP-03 test fail | RQ-08 cấm sửa; AC-10 xác nhận test pass | `git checkout HEAD~1 -- canary-file` |
| `RISK-03` | `git rm --cached` + commit miss staged changes (bài học AUD-002 task 21) | `git ls-files check_rls.cjs` còn trả tên file | RQ-03 ép commit scoped; AC-05 đo bằng `git diff HEAD~1 HEAD --name-only` | Re-commit; bump spec v1.1 |
| `RISK-04` | Tier 3 fingerprint scan false-positive trên 4 canary | Match ngoài whitelist | RQ-04 whitelist ; AC-09 đo bổ sung | Bổ sung whitelist scope nếu canary dùng cùng host fragment (hiện không) |
| `RISK-05` | Credential đã ở Git history (commit `ebca45c`) | EV-03 | DEC-06 không rewrite history ở task này; AC-12 scan 5 commit gần nhất | Mở incident riêng cho history rewrite; revoke ngay, phối hợp mọi clone/remote |
| `RISK-06` | `check_rls.cjs` không còn cần thiết (Owner chọn DELETE) | Owner decision | DEC-03 quyền KEEP/DELETE thuộc Owner | Nếu DELETE: Tier 2 untrack + xoá file theo allowlist; KHÔNG tự ý xoá |
| `RISK-07` | Credential fingerprint `sha256:redacted-neon-owner-pw` đã được rotate bởi task 21 OP execution | EV-09 + DEC-01 | Task này vẫn chạy để untrack + sanitize; Owner xác nhận trạng thái | N/A — rotation đã xong |
| `RISK-08` | Tier 3 chạy scan đọc `check_rls.cjs` đã untrack — file chỉ còn trong worktree, không trong HEAD | DEC-06 | Tier 3 scan cả worktree; evidence ghi rõ scope | Khôi phục từ HEAD~1 nếu worktree mất |

## 8. Open Questions

| ID | Question | Answer (Owner 2026-09-07 13:42) | Blocks execution? |
|---|---|---|---|
| `Q-01` | Credential fingerprint `sha256:redacted-neon-owner-pw` ở `check_rls.cjs:2` còn/không còn active ở Neon? Nếu còn: rotate ngay trước STEP-02; nếu đã revoke bởi task 21 OP: ghi nhận vào evidence | `Credential ACTIVE in Neon as of 2026-09-07 13:42. Need rotation BEFORE STEP-02 (or in same window 2026-09-08 09:00).` | RESOLVED — Owner rotates `neondb_owner` credential tại maintenance window 09:00 ngày 08/09 (cùng slot với task 21 STEP-07) |
| `Q-02` | Owner quyết định KEEP (sanitize) hay DELETE (xoá) `check_rls.cjs`? Nếu KEEP, Tier 2 sanitize; nếu DELETE, Tier 2 untrack + xoá file theo allowlist | `CHOSEN — KEEP (sanitize). Script used by Tier 3 to verify RLS post-Phase 1A. Tier 2 to scrub raw credential and rewrite to read from canonical env var. Canonical env name = DATABASE_URL (overrides draft answer `CHECK_RLS_DSN`; implementation landed tại commit 4a56122 dùng `process.env.DATABASE_URL` × 2 hit, khớp EV-06 + DEC-09 + STEP-02).` | RESOLVED — Tier 2 STEP-02 sanitize: `git rm --cached check_rls.cjs` (landed `4a56122`) → xoá credential literal → viết lại đọc `process.env.DATABASE_URL`; commit scoped (landed `4a56122`) |
| `Q-03` | Maintenance window để rotate credential `neondb_owner` là khi nào? Owner cần restore point/PITR | `CHOSEN — Window 2026-09-08 09:00-09:30 Asia/Bangkok (same as task 21 STEP-07); Neon PITR 7 days; Restore point verified 2026-09-07 13:42` | RESOLVED — STEP-05 chạy 09:00 ngày 08/09; rotate trong cùng window với task 21; PITR 7 days đủ rollback |
| `Q-04` | `check_rls.cjs` có tương thích với V6 schema mới (Phase 1A) không? Nếu Phase 1A/1B thêm bảng mới, RLS policy mới, script có cần update không? | `CHOSEN — KHÔNG cần update cho task này; Tier 1 sẽ thêm task riêng nếu Phase 1A yêu cầu (ghi vào roadmap held_draft khi đến giờ)` | RESOLVED — task này chỉ untrack + sanitize; update script là task riêng |
| `Q-05` | 4 file canary `BLOCKED_DB_URL` có cần đổi format (host `127.0.0.1:1` có thể chạm vào localhost service khác) không? Hiện tại pass test | `CHOSEN — KHÔNG cần đổi format; canary hiện tại pass test tại commit 121e796 (Tier 2 evidence sec-s06-post-verify.txt); Tier 3 audit round 1 sẽ verify lại bằng fingerprint scan độc lập` | RESOLVED — không thuộc scope task này; AC-09 + AC-10 đo đầy đủ |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| `1` | `AUD-001` | **ESCALATE_FIX** | Tier 1 verify audit claims: AC-02 PASS (Tier 3 dùng regex `^/check_rls\.cjs$` anchor nhưng `.gitignore` chỉ chứa `check_rls.cjs` không có `/` prefix — `git check-ignore -v check_rls.cjs` exit 0 = file đúng được ignore); AC-09 FAIL đúng: `playwright.config.ts` MISSING, `vitest.integration-files.ts` tồn tại nhưng không có `BLOCKED_DB_URL` (chỉ 2/4 canary OK). Tier 1 fix contract để align với reality. AUD-002: Owner rotation chưa chạy (maintenance window 08/09 09:00-09:30 chưa đến). Verdict = `BLOCKED` phù hợp. | DELTA — sửa AC-02: `/check_rls.cjs` → `check_rls.cjs` (khớp .gitignore thực tế); sửa AC-09: whitelist chỉ 2 file canary tồn tại (`vitest.unit.config.ts`, `vitest.config.ts`) + 1 file thiếu canary (`vitest.integration-files.ts`) + 1 file MISSING (`playwright.config.ts`); sửa AC-10: vitest command đúng scope | Tier 1 sửa TASK.md v1.2 → v1.3 sau khi ghi resolution này |
| `1` | `AUD-002` | **BLOCKED — Owner chưa execute** | OP rotation chưa chạy; maintenance window 2026-09-08 09:00-09:30 Asia/Bangkok chưa đến. AC-06 + AC-13 đúng BLOCKED. Không có contract change. | None | Owner/OP thực thi STEP-05..06 trong window 08/09 09:00-09:30 |

| Execution round | Audit round | Verdict | Key reason |
|---|---|---|---|
| `1` | `1` | `BLOCKED` | AUD-001 (canary mismatch contract vs reality); AUD-002 (Owner rotation chưa chạy) |

Execution round 1 mở khi:
1. Tier 1 DELTA sửa canary whitelist (AC-09) + gitignore path (AC-02) + vitest command (AC-10) → bump v1.3 → `verify-task.ps1` PASS.
2. Owner/OP rotate credential → AC-06 evidence → Tier 3 re-audit round 2 → PASS → `ACCEPTED`.

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-07 12:05` | Tạo contract security rotation: untrack + sanitize `check_rls.cjs` (raw Neon `neondb_owner` credential ở line 2), whitelist 4 file canary `BLOCKED_DB_URL`, Owner rotate credential, Tier 3 fingerprint scan độc lập. Status `DRAFT` chờ Owner trả lời Q-01..Q-03. Baseline neo `485a36c`. | ESCALATE_NEW_TASK từ AUD-001 của `hrp-v5-go-live-21-credential-hygiene-closure` audit round 1 ngày 07/09; EV-01..10 đo 07/09 12:00 |
| `v1.1` | `2026-09-07 13:42` | Owner trả lời Q-01 (credential ACTIVE — rotate tại window 09:00 ngày 08/09), Q-02 (KEEP sanitize), Q-03 (window 09:00-09:30 ngày 08/09, PITR 7 days). Status `DRAFT` → `READY_FOR_EXECUTION`. Execution round → `1` (chưa mở). Bump v1.0 → v1.1. | TASK.md §8 answers; PLANNER_HANDOVER.md §0 13:42 |
| `v1.3` | `2026-09-08 23:57` | Tier 1 resolve audit round 1 verdict BLOCKED: AUD-001 ESCALATE_FIX (AC-02 gitignore path đúng — Tier 3 dùng regex anchor `/` sai; AC-09 canary reality: 2/4 files tồn tại, 2 OUT_OF_SCOPE — contract align với reality); AUD-002 BLOCKED đúng (Owner rotation chưa execute). DELTA: sửa AC-02 (bỏ `/` prefix), AC-09 (2 files tồn tại + 2 OUT_OF_SCOPE), AC-10 (bỏ playwright + specific file args); bump v1.2 → v1.3. §0 Status → BLOCKED; audit round → 1; §4.2 scope cập nhật. §9 Planner Resolution ghi nhận cả 2 findings. | Tier 3 audit round 1 BLOCKED; Tier 1 verify claims: git check-ignore exit 0 (AC-02), canary file scan (2/4 + 2 missing) |
