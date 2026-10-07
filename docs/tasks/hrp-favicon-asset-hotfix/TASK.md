# TASK — `hrp-favicon-asset-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-favicon-asset-hotfix` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `FAST + single binary asset swap on the favicon slot. No schema, no auth, no PII, no API/contract change, no UI logic, no dependency. Tier 1 self-reviews per tier1.md. NONE chosen because the only delivery surface is one binary ICO at a well-known file-convention path plus a static-fence test; no public-API/PII/data blast radius. PWA icons/manifest are explicitly out of scope (the manifest does not reference the favicon slot).` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `cdde6cef6fd5fdda8c098fb90d9d6d8989feda67` |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| In-scope roots | `app/favicon.ico`; `src/pwa/favicon-asset.test.ts` (new); `docs/tasks/hrp-favicon-asset-hotfix/**` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `app/**` (ngoại trừ `app/favicon.ico` đã khai trong in-scope); `src/domains/**`; `src/shared/auth/**`; `src/lib/**`; `next.config.*`; `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `public/hrp-logo.webp`; `public/logo.png`; `public/icons/**`; `public/manifest.json`; `public/sw.js`; `public/mockup/**`; `scripts/**`; `.github/**`; `app/layout.tsx` (declaration đã đúng, không đổi) |
| Required gates | `pwsh .ai-pipeline/scripts/verify-pipeline.ps1`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts`; `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite, carry-forward evidence acceptable) |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `NONE: /deliver → /resolve` |

> Lane là `FAST`: hotfix một asset nhị phân duy nhất ở slot favicon. Không schema, không
> auth, không migration, không UI logic, không dependency, không API, không thay đổi
> PWA manifest/icons. Theo `tier1.md` `FAST` mặc định `Audit mode: NONE`; Tier 1 tự
> review tại handoff và không gọi Tier 3.

> **Quyết định T0 đã chốt trước khi viết contract**:
> - File nguồn `C:\Users\Admin\Downloads\favicon.ico` **truy cập được** (15.086 bytes,
>   header ICO hợp lệ `00 00 01 00 03 00` = ICO với 3 entries; entry 0 = 16×16 32bpp,
>   entry 1 = 32×32 32bpp, entry 2 = 24×24 32bpp). Không có T0 blocker.
> - Repo convention là `app/favicon.ico` (Next.js 15 App Router auto-serve tại `/favicon.ico`),
>   KHÔNG phải `public/favicon.ico`. `app/layout.tsx` line 11-13 đã có `icons: { icon:
>   '/favicon.ico' }` (redundant nhưng vô hại — convention file tự pick up).
> - Hotfix = **replace** `app/favicon.ico` (285.478 bytes, commit `285d1765`) bằng file
>   Owner cung cấp (15.086 bytes, 3 entries nhỏ hơn). File Owner cung cấp nhỏ hơn vì nó
>   đơn giản hơn (3 entries 16/32/24) so với file hiện tại (4 entries 16/32/64/48) — đây
>   là quyết định brand của Owner, không phải optimization kỹ thuật.
> - PWA manifest (`public/manifest.json`) và service worker (`public/sw.js`) chỉ reference
>   `/icons/icon-192.png` và `/icons/icon-512.png` (slot Worker PWA) — favicon slot là
>   một file convention riêng, tách biệt hoàn toàn khỏi PWA surface. Không cần đụng manifest
>   hay sw.js.

## 1. Outcome

### 1.1 User-visible outcome

Sau hotfix:

- `app/favicon.ico` là file ICO chính xác mà Owner cung cấp (15.086 bytes, SHA-256 sẽ
  được pin trong HANDOFF).
- Trình duyệt tải favicon từ `/favicon.ico` (Next.js App Router auto-serve từ
  `app/favicon.ico`) trả về `200` với `Content-Type: image/x-icon` (hoặc `image/vnd.microsoft.icon`).
- Tab title, bookmark, và PWA install badge hiển thị đúng biểu tượng Owner cung cấp.
- `app/layout.tsx` line 11-13 vẫn giữ nguyên `icons: { icon: '/favicon.ico' }` (declaration
  đã đúng, không cần sửa).

### 1.2 Non-goals

- Không thay đổi `app/layout.tsx` (declaration đã đúng theo convention).
- Không thay đổi `public/manifest.json` (manifest chỉ reference PWA icons, không reference
  favicon slot).
- Không thay đổi `public/sw.js` (service worker chỉ reference PWA icons, không reference
  favicon slot).
- Không thay đổi `public/icons/icon-192.png`, `public/icons/icon-512.png` (PWA icons
  thuộc task `hrp-pwa-icon-assets-hotfix` đã freeze, không thuộc scope task này).
- Không thay đổi `public/logo.png` hay `public/hrp-logo.webp` (brand assets).
- Không thay đổi `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (không thêm
  dependency nào).
- Không tạo file ICO mới hay convert/resize file Owner cung cấp; dùng **nguyên văn** file
  Owner cung cấp (theo directive "Giữ nguyên file nguồn").
- Không tạo biến thể nào (apple-touch-icon, maskable PWA favicon, dark-mode favicon) trừ
  khi test phát hiện gap thực sự; PWA manifest đã handle adaptive icon qua
  `purpose: any maskable` ở `/icons/icon-{192,512}.png`.
- Không schema, không migration, không auth/permission, không API route mới, không UI logic,
  không copy/translation.
- Không production deploy, không production-database touch, không production-credential
  load. Branch sẽ được push sau khi freeze Implementation SHA; CI được chờ; KHÔNG tự
  merge/deploy.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `Test-Path 'C:\Users\Admin\Downloads\favicon.ico'` = `True`; `Get-Item` cho thấy `Length = 15086`, `LastWriteTime = 10/7/2026 11:42:07 AM`. | Xác nhận file nguồn Owner cung cấp **truy cập được** từ máy chạy agent. Không có T0 blocker. |
| `EV-02` | `node -e "const f=require('fs').readFileSync('C:/Users/Admin/Downloads/favicon.ico');const h=f.slice(0,22);console.log('len=',f.length,'sig=',h.slice(0,4).toString('hex'),'type=',h.readUInt16LE(2),'count=',h.readUInt16LE(4),'e0=',h[6],'x',h[7],'bc=',h.readUInt16LE(12),'sz=',h.readUInt32LE(14),'off=',h.readUInt32LE(18))"` in ra `len= 15086 sig= 00000100 type= 1 count= 3 e0= 16 x 16 bc= 32 sz= 1128 off= 54`. | Xác nhận file nguồn là **ICO hợp lệ** (signature `00 00 01 00` = ICO magic, type=1, 3 entries, entry 0 là 16×16 32bpp, kích thước entry 0 = 1128 bytes, offset bắt đầu = 54). Đủ điều kiện làm favicon. |
| `EV-03` | `app/favicon.ico` hiện tại ở baseline `cdde6cef` là 285.478 bytes, commit `285d1765 chore(bcc): metadata trang Tra cuu Bang cong + favicon`. Header: `00 00 01 00 04 00` (4 entries 16/32/64/48). | Xác nhận asset hiện hữu và xác nhận repo convention dùng `app/favicon.ico` (App Router), không phải `public/favicon.ico`. |
| `EV-04` | `app/layout.tsx` line 11-13: `icons: { icon: '/favicon.ico' }`; line 20: `manifest: '/manifest.json'`. | Xác nhận declaration đã đúng theo Next.js 15 App Router convention; không cần sửa layout. |
| `EV-05` | `public/manifest.json` chỉ reference `/icons/icon-192.png` và `/icons/icon-512.png` (Worker PWA). `public/sw.js` line 175-177: `icon: '/icons/icon-192.png'`, `badge: '/icons/icon-192.png'`. | Xác nhận PWA surface tách biệt khỏi favicon slot; không cần đụng manifest/sw.js. |
| `EV-06` | Sau implementation: `git diff <baseline>..HEAD -- app/favicon.ico` chỉ thay đổi đúng file `app/favicon.ico`; `git status --porcelain` trên các forbidden path đều rỗng. | Xác nhận diff scope đúng ranh giới. |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Dùng file Owner cung cấp (`C:\Users\Admin\Downloads\favicon.ico`, 15.086 bytes) **nguyên văn** — không convert, không resize, không re-encode. Copy byte-for-byte sang `app/favicon.ico`. | `CHOSEN` |
| `DEC-02` | Repo convention là Next.js 15 App Router file-based metadata: file `app/favicon.ico` tự động được serve tại `/favicon.ico` và tự đăng ký trong `<head>`. KHÔNG tạo `public/favicon.ico`. | `CHOSEN` |
| `DEC-03` | `app/layout.tsx` declaration `icons: { icon: '/favicon.ico' }` (line 11-13) **giữ nguyên**: dù Next.js tự pick up file convention, declaration là idempotent và explicit (giúp IDE/preview hiển thị đúng). Không sửa layout. | `CHOSEN` |
| `DEC-04` | `public/manifest.json` và `public/sw.js` **không đụng**: PWA surface tách biệt khỏi favicon slot, và contract PWA đã được freeze bởi `hrp-pwa-icon-assets-hotfix` (`df87e7fd`). | `CHOSEN` |
| `DEC-05` | Test đặt tại `src/pwa/favicon-asset.test.ts` (lane unit glob đã cover: `src/**/*.test.ts`), pure filesystem + Buffer + ICO header decode, không có side-effect, không có dependency mới. Test bao gồm: (a) file tồn tại, (b) signature ICO hợp lệ, (c) byte-count = 15086, (d) số entries ≥ 1, (e) entry đầu có dimensions 16×16 (tương thích classic favicon slot), (f) `app/layout.tsx` vẫn reference `/favicon.ico`. | `CHOSEN` |
| `DEC-06` | Copy file bằng Node `fs.copyFileSync` chạy trong worktree tại bước STEP-02; KHÔNG dùng PowerShell `Copy-Item` (tránh race với encoding/BOM rule). KHÔNG commit script copy; nó chạy một lần trong worktree, không thuộc deliverable. | `CHOSEN` |
| `DEC-07` | Sau khi copy, xác minh SHA-256 của file trong worktree bằng `node -e "const c=require('crypto');console.log(c.createHash('sha256').update(require('fs').readFileSync('app/favicon.ico')).digest('hex'))"` — kết quả pin trong HANDOFF §0 Implementation SHA identity. | `CHOSEN` |
| `DEC-08` | Branch `codex/t1c-favicon-asset-hotfix` từ baseline `cdde6cef6fd5fdda8c098fb90d9d6d8989feda67`. Worktree `C:\CodeApp\HrP-t1c-favicon-asset-hotfix`. Push sau khi commit; KHÔNG merge, KHÔNG deploy. | `CHOSEN` |

### 3.1 Build vs Adopt

| Capability | Existing options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| ICO file source | file Owner cung cấp (3 entries 16/32/24 32bpp) | `N/A` | N/A | N/A | N/A | File này là asset brand, không phải runtime capability. Theo directive "Giữ nguyên file nguồn", copy byte-for-byte, không qua wrapper. |
| ICO decoder (test) | Node built-in `Buffer` | `N/A` | N/A | N/A | N/A | Test chỉ parse header (22 bytes) và assert dimensions; không cần full ICO decoder. Node built-in đủ dùng. Không thêm dependency. |

- `N/A`: task không tạo runtime capability, không thêm dependency, không thay đổi shared framework.

### 3.2 Build vs Automate

| Capability | Existing platform/options | Decision | Platform/source | Authority boundary | Retry/idempotency | Observability/recovery | Reason |
|---|---|---|---|---|---|---|---|
| Copy file nguồn vào worktree | Node `fs.copyFileSync` one-shot | `N/A` | N/A | N/A | N/A | N/A | Task không tạo connector, scheduler, notification worker, hay multi-system workflow. Đây là single-file asset swap. |

- `N/A`: task không tạo/thay connector, scheduler, notification worker, hay multi-system/operator workflow.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `app/favicon.ico` ở implementation SHA là bản sao byte-for-byte của file Owner cung cấp (`C:\Users\Admin\Downloads\favicon.ico`); SHA-256 khớp và pin trong HANDOFF §0. |
| `RQ-02` | File là ICO hợp lệ: header `00 00 01 00` (ICONDIR), `type = 1` (ICO), `count ≥ 1` (≥ 1 entries); entry đầu có `width = 16` và `height = 16` (tương thích classic browser favicon slot). |
| `RQ-03` | `app/layout.tsx` vẫn reference `/favicon.ico` ở `icons.icon` (declaration idempotent với App Router file convention; không bị xoá, không bị đổi tên, không bị thay đường dẫn). |
| `RQ-04` | `public/manifest.json` và `public/sw.js` không bị thay đổi (byte-identical với baseline `cdde6cef`). |
| `RQ-05` | `public/icons/icon-192.png` và `public/icons/icon-512.png` không bị thay đổi (thuộc `hrp-pwa-icon-assets-hotfix` đã freeze; byte-identical với baseline). |
| `RQ-06` | `public/logo.png` và `public/hrp-logo.webp` không bị thay đổi (brand assets; byte-identical với baseline). |
| `RQ-07` | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` không bị thay đổi (không thêm dependency). |
| `RQ-08` | `prisma/schema.prisma` và `prisma/migrations/**` không bị thay đổi (không schema, không migration). |
| `RQ-09` | Test mới `src/pwa/favicon-asset.test.ts` đọc `app/favicon.ico` + `app/layout.tsx` từ disk và assert RQ-01 (SHA-256 khớp digest đã ghi nhận từ file Owner), RQ-02 (ICO header hợp lệ, 16×16 ở entry 0), RQ-03 (layout reference `/favicon.ico`). Test phải portable trong CI, không phụ thuộc đường dẫn file local của Owner. |
| `RQ-10` | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts` exit 0. |
| `RQ-11` | `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite) exit 0. |
| `RQ-12` | `node .ai-pipeline/scripts/verify-encoding.mjs` (hoặc `pwsh .ai-pipeline/scripts/verify-encoding.ps1`) trên changed surface báo `RESULT: PASS`. ICO là binary, không nằm trong text-extension list của script, nên file sẽ tự skip. Surface text duy nhất là file test mới + TASK.md + HANDOFF.md — cả 3 đều UTF-8 no-BOM. |

### 4.2 Scope boundaries

- **In:**
  - `app/favicon.ico` (replace: byte-for-byte copy từ `C:\Users\Admin\Downloads\favicon.ico`).
  - `src/pwa/favicon-asset.test.ts` (new).
  - `docs/tasks/hrp-favicon-asset-hotfix/TASK.md` (file này).
  - `docs/tasks/hrp-favicon-asset-hotfix/HANDOFF.md` (new, post-implementation).
  - `docs/tasks/hrp-favicon-asset-hotfix/evidence/` (thư mục trống sẵn; chỉ thêm file nếu
    test fail hoặc cần supplementary evidence).
- **Out (read-only, byte-identical với baseline):**
  - `app/layout.tsx` — declaration đã đúng.
  - `public/manifest.json` — PWA contract đã freeze.
  - `public/sw.js` — service worker contract đã freeze.
  - `public/icons/icon-192.png`, `public/icons/icon-512.png` — PWA icons thuộc task khác.
  - `public/logo.png`, `public/hrp-logo.webp` — brand assets.
- **Allowed task artifacts:** `docs/tasks/hrp-favicon-asset-hotfix/**`.
- **Copy script:** Một one-shot Node one-liner (hoặc file `.mjs` tạm trong worktree) để
  copy `app/favicon.ico` từ `C:\Users\Admin\Downloads\favicon.ico`. **KHÔNG commit** script
  copy; nó chạy một lần rồi xoá (per C-06 hygiene tương tự `hrp-pwa-icon-assets-hotfix`).

### 4.3 Domain boundaries

- **Data/state:** `N/A — không schema, không persistence, không DB touch.`
- **Permission/security:** `N/A — không auth, không API, không RLS.`
- **Interface/API:** `N/A — không API route mới. `app/favicon.ico` là App Router file
  convention; Next.js tự serve tại `/favicon.ico` và tự đăng ký trong `<head>`.`
- **Migration/rollback:** `N/A — không migration. Hotfix forward-only: `git revert` loại
  bỏ thay đổi `app/favicon.ico` sạch như khi thêm. Nếu muốn rollback nhanh hơn, copy
  lại file từ baseline `cdde6cef` bằng `git show cdde6cef:app/favicon.ico > app/favicon.ico`.`

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Worktree `C:\CodeApp\HrP-t1c-favicon-asset-hotfix` tại baseline `cdde6cef6fd5fdda8c098fb90d9d6d8989feda67` | Xác nhận worktree sạch, đúng baseline, đúng branch. | `git rev-parse HEAD` in `cdde6cef...`; `git status --porcelain` rỗng; `Test-Path C:\Users\Admin\Downloads\favicon.ico` = `True`. | Worktree dirty, sai baseline, hoặc source file không truy cập được. |
| `STEP-02` | Copy `C:\Users\Admin\Downloads\favicon.ico` → `app/favicon.ico` (overwrite file hiện hữu) bằng Node `fs.copyFileSync`. | Đưa file Owner cung cấp vào đúng slot convention của repo. | `node -e "console.log(require('fs').readFileSync('app/favicon.ico').length)"` in `15086`. | File không copy được, size khác 15086, hoặc working tree có thêm file ngoài `app/favicon.ico`. |
| `STEP-03` | Pin SHA-256 của `app/favicon.ico` ở worktree. | Đóng băng asset identity cho HANDOFF và để Tier 1 tự review byte-identity. | `node -e "const c=require('crypto');console.log(c.createHash('sha256').update(require('fs').readFileSync('app/favicon.ico')).digest('hex'))"` in 64 hex chars; kết quả pin trong HANDOFF §0. | SHA không match expectation (file copy bị corrupt / lệch byte). |
| `STEP-04` | Tạo `src/pwa/favicon-asset.test.ts` (vitest unit test). | Static-fence bảo vệ contract RQ-01..RQ-03 + RQ-04. | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts` exit 0; tất cả case pass. | Bất kỳ case nào fail. |
| `STEP-05` | Self-review: chạy full unit suite, encoding gate, whitespace check, byte-identity check trên `manifest.json` / `sw.js` / `app/layout.tsx` / PWA icons / brand assets / `package.json` / lockfile / `prisma/`. | Đảm bảo hotfix không lan ngoài ranh giới. | Full unit suite exit 0; `git status --porcelain` trên forbidden paths rỗng; `verify-encoding.ps1` PASS; `git diff --check` exit 0; byte-identity check exit 0. | Bất kỳ check nào fail. |
| `STEP-06` | Commit forward-only trên `codex/t1c-favicon-asset-hotfix`; pin exact `Implementation SHA`; push branch. | Freeze surface; chuẩn bị HANDOFF. | `git rev-parse HEAD` resolve về 40-hex SHA ghi trong HANDOFF; `git status --porcelain` rỗng sau commit; `git push origin codex/t1c-favicon-asset-hotfix` exit 0. | SHA không match HANDOFF record, post-commit tree dirty, hoặc push fail. |
| `STEP-07` | Viết `HANDOFF.md`; chạy canonical gates `verify-pipeline.ps1`, `verify-task.ps1`, `verify-handoff.ps1`, `verify-encoding.mjs`. | Đóng gate cuối. | Tất cả 4 gate báo `RESULT: PASS`. | Bất kỳ gate nào FAIL. |
| `STEP-08` | **DỪNG TẠI ĐÂY**. Không mở PR tự động, không merge, không deploy, không touch production. Thông báo cho Owner với Implementation SHA + PR-ready branch + bằng chứng gate pass; chờ Owner quyết định go-live. | Tôn trọng directive "Vẫn dừng trước merge/deploy". | Self-attest trong HANDOFF §5 rằng không có lệnh `gh pr create --merge`, `vercel --prod`, `prisma migrate deploy`, hay bất kỳ lệnh nào nhắm production. | Tự ý tạo PR merge, hoặc trigger deploy, hoặc touch production DB. |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `app/favicon.ico` tồn tại ở implementation SHA và là bản sao byte-for-byte của file Owner đã duyệt. | Chạy `node -e "const c=require('crypto'),fs=require('fs');console.log(c.createHash('sha256').update(fs.readFileSync('app/favicon.ico')).digest('hex'))"`; kết quả phải bằng digest đã ghi nhận khi đối chiếu file nguồn Owner: `042ebc6a9fcffcd0d4df27b26ed0467af6db00d85c7ae0e7e3621dd1bdab40ed`. CI không cần truy cập file nguồn local. |
| `AC-02` | `app/favicon.ico` là ICO hợp lệ: ICONDIR `00 00 01 00`, type=1, count≥1, entry 0 width=16, height=16. | `favicon-asset.test.ts` đọc 22 bytes đầu và assert. |
| `AC-03` | `app/layout.tsx` vẫn reference `/favicon.ico` ở `icons.icon`. | `favicon-asset.test.ts` đọc file và regex match `icons:\s*{[^}]*icon:\s*['"]/favicon\.ico['"]`. |
| `AC-04` | `public/manifest.json` byte-identical với baseline `cdde6cef`. | `git diff cdde6cef..HEAD -- public/manifest.json` exit 0, output rỗng. |
| `AC-05` | `public/sw.js` byte-identical với baseline `cdde6cef`. | `git diff cdde6cef..HEAD -- public/sw.js` exit 0, output rỗng. |
| `AC-06` | `public/icons/icon-192.png` byte-identical với baseline `cdde6cef`. | `git diff cdde6cef..HEAD -- public/icons/icon-192.png` exit 0, output rỗng. |
| `AC-07` | `public/icons/icon-512.png` byte-identical với baseline `cdde6cef`. | `git diff cdde6cef..HEAD -- public/icons/icon-512.png` exit 0, output rỗng. |
| `AC-08` | `public/logo.png` và `public/hrp-logo.webp` byte-identical với baseline `cdde6cef`. | `git diff cdde6cef..HEAD -- public/logo.png public/hrp-logo.webp` exit 0, output rỗng. |
| `AC-09` | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` không đổi. | `git status --porcelain` trên 3 file rỗng. |
| `AC-10` | `prisma/schema.prisma` và `prisma/migrations/**` không đổi. | `git status --porcelain -- prisma/schema.prisma 'prisma/migrations/**'` rỗng. |
| `AC-11` | Test fail nếu bất kỳ RQ-01..RQ-03 nào bị vi phạm. | Manually tamper file (xoá / đổi size / đổi header byte) và re-run test; test báo fail rõ. |
| `AC-12` | `pnpm exec vitest run --config vitest.unit.config.ts src/pwa/favicon-asset.test.ts` exit 0. | Chạy lệnh. |
| `AC-13` | `pnpm exec vitest run --config vitest.unit.config.ts` (full unit suite) exit 0. | Chạy lệnh. |
| `AC-14` | Whitespace check trên staged surface và HEAD: `git diff --check --cached` và `git diff --check HEAD` exit 0, không output. | Chạy 2 lệnh. |
| `AC-15` | `node .ai-pipeline/scripts/verify-encoding.mjs` (hoặc `pwsh .ai-pipeline/scripts/verify-encoding.ps1`) trên changed text surface báo `RESULT: PASS` (`0 BOM, 0 invalid UTF-8`). | Chạy script. |
| `AC-16` | Implementation SHA pin trong HANDOFF §0, khớp `git rev-parse HEAD`. | So sánh SHA. |
| `AC-17` | **Stop gate**: Branch pushed; CHƯA có PR merge; CHƯA có deploy. | `git log --format=%s HEAD` không chứa `deploy` / `migrate` / `prisma` / `db push`; self-attest trong HANDOFF §5. |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02`, `STEP-03` | `AC-01` |
| `RQ-02` | `STEP-02`, `STEP-04` | `AC-02` |
| `RQ-03` | `STEP-04` | `AC-03` |
| `RQ-04` | `STEP-05` | `AC-04`, `AC-05` |
| `RQ-05` | `STEP-05` | `AC-06`, `AC-07` |
| `RQ-06` | `STEP-05` | `AC-08` |
| `RQ-07` | `STEP-05` | `AC-09` |
| `RQ-08` | `STEP-05` | `AC-10` |
| `RQ-09` | `STEP-04`, `STEP-05` | `AC-11` |
| `RQ-10` | `STEP-05` | `AC-12` |
| `RQ-11` | `STEP-05` | `AC-13` |
| `RQ-12` | `STEP-05` | `AC-15` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | File Owner cung cấp (15.086 bytes, 3 entries 16/32/24) **nhỏ hơn** file hiện hữu (285.478 bytes, 4 entries 16/32/64/48). Một số browser/platform cũ có thể cache favicon ở size 64×48 mà file mới không có. | Hotfix là quyết định brand của Owner; 16/32/24 vẫn cover >99% browser hiện đại (Chrome, Edge, Safari, Firefox 2020+ đều dùng 16 và 32 làm chính). 64×48 chỉ cần cho một số legacy desktop dock. Nếu Owner muốn cover legacy, có thể append thêm entries vào file — nhưng directive "Giữ nguyên file nguồn" ngăn điều đó. |
| `RISK-02` | Có thể Owner muốn **giữ** file favicon hiện tại (chỉ thay vị trí / context), chứ không phải replace. Nhận định "thay" dựa trên directive "dùng file này làm favicon cho website" + việc file hiện tại đã là favicon của website. Nếu hiểu sai, revert bằng `git revert` là sạch. | Static-fence test chỉ assert byte-size & SHA match file Owner; nếu Owner muốn giữ file cũ, đổi assertion thành byte-size cũ + SHA cũ. Tier 1 không tự quyết; chờ Owner. |
| `RISK-03` | Layout declaration `icons: { icon: '/favicon.ico' }` (line 11-13) là redundant với App Router file convention nhưng nếu Tier 1 tương lai xoá nó và chỉ dựa vào file convention, test vẫn pass. | Test assert `app/layout.tsx` vẫn reference `/favicon.ico`; nếu Tier 1 tương lai muốn bỏ declaration thì test sẽ fail, đó là feature — declaration explicit tốt hơn implicit. |
| `RISK-04` | Hotfix chỉ là một file ICO; nếu CI fail vì lý do khác (vd. test ở repo khác bị regress) thì PR bị block. | Branch độc lập; carry-forward evidence cho full unit suite; correction budget = 1 nếu test fail. |
| `RISK-05` | Tier 1 vô tình tạo PR và merge do auto-prompt. | STEP-08 explicit "DỪNG TẠI ĐÂY"; HANDOFF §5 self-attest không có lệnh merge/deploy; AC-17 enforce. |

## 8. Open Questions

- None. Owner directive rõ ràng ("dùng file này làm favicon", "giữ nguyên file nguồn",
  "không tự thay PWA icons/manifest", "cập nhật TASK contract trước khi implement",
  "dừng trước merge/deploy"). Contract đã chốt `Contract gate: READY_TO_CODE` với
  `Decision state: CLOSED`.

## 9. Planner Resolution

Tier 1 append sau review/audit. Audit `NONE` resolve trực tiếp từ HANDOFF;
`LIGHT` resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-10-07` | Initial contract | Initial |
| `v1.1` | `2026-10-07` | AC-01/RQ-09 verify the recorded approved digest rather than opening the Owner's local source path | Make the verification portable on hosted CI without weakening byte-identity against the source digest |
