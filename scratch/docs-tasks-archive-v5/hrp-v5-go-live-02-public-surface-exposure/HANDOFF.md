# HANDOFF: hrp-v5-go-live-02-public-surface-exposure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-02-public-surface-exposure` |
| Spec version đã thực thi | `v1.1` (bảng Control ghi `Updated 2026-08-29 14:10 Asia/Bangkok`) |
| Work type | `CODE` |
| Audit mode (khớp TASK) | `CODE_AUDIT` |
| Execution round | `1` |
| Current audit round | `0` (chưa audit) |
| Status | `READY_FOR_AUDIT` |
| Baseline | `ad79d72` trên `main` — `git rev-parse --short HEAD` = `ad79d72`, không drift |
| Executor | Tier 2 — Engineer |
| Commit | **KHÔNG commit** — cây làm việc còn dirty đúng theo cách `AC-08` đo (xem `DEV-03`) |
| Started/updated | 2026-08-29, gate cuối chạy ~13:50, nộp ~14:05 Asia/Bangkok |
| Kết quả | 8 AC thuộc Tier 2 PASS bằng evidence thật (`AC-01`, `AC-03..AC-09`); `AC-02`, `AC-10` và phần live của `AC-06` chờ Owner sau deploy (`DEC-05`) |

## 1. Kết luận nhanh

Tôi đã bịt lỗ rò tài liệu nội bộ, dọn jargon trên bề mặt công khai và sửa title tab:

1. **`scripts/copy-static.mjs` không còn copy `docs/` sang `public/docs/`.** Chạy script trên máy thật: `public/docs` (83 file, gồm cả `docs/tasks/**`, runbook, `PLANNER_HANDOVER.md`) bị dọn sạch; chạy lần hai từ trạng thái sạch cũng không sinh lại. `rmSync(public/docs)` giữ nguyên nên mọi build sau tự dọn artifact cũ.
2. **Trang `/ve-chung-toi`** (nằm trong navbar + footer của *mọi* trang công khai) mất hết card/CTA/footer-link nội bộ: card "Demo BoD — Mockup", 2 card roadmap nội bộ, CTA mockup, dòng footer `UNIFIED_PLAN_v4.md`, meta-strip `v4.22 / 36 frame hi-fi / 11 hotspot`. File 220 → 164 dòng, trang vẫn còn hero + 3 card + liên hệ.
3. **CTA "Tìm hiểu về HRP" hết `404`**: cả card giới thiệu và CTA đều trỏ `/ve-hrp.html` (đúng `cleanUrls: false`). Không thêm rewrite nào vào `vercel.json`.
4. **Title tab**: nhận nguyên bản 5 file metadata đang dirty (`DEC-06`, không sửa 1 byte), thêm 2 layout Server Component trong suốt cho `/jobs` + `/track` và `metadata` cho `/login` (`DEC-07`). `grep "Tra cứu Bảng công" app/` trả rỗng; title đọc từ HTML prerender thật khớp `AC-09`, trừ `/admin` là route động có role-guard nên không prerender được (`LIM-01`).

Gate hồi quy chạy cuối cùng, cả 4 exit 0: `typecheck`, `lint` (0 error / 492 warning nền), `test:unit` (91 file / 1408 test), `build`.

## 2. STEP → RQ → file/artifact

| STEP | RQ | File/artifact | Tôi đã làm gì |
|---|---|---|---|
| `STEP-01` | `RQ-01` | `scripts/copy-static.mjs` | Bỏ 1 lệnh `cpSync(docs → public/docs)`, giữ `rmSync`, sửa comment + `console.log` |
| `STEP-02` | `RQ-02` | `app/(portal)/ve-chung-toi/page.tsx` | Bỏ mọi entry trỏ `/docs/...` (1 card + 1 CTA + 1 footer-link) và 2 card roadmap nội bộ |
| `STEP-03` | `RQ-03` | cùng file trên | Bỏ meta-strip `v4.22 / 36 frame hi-fi / 11 hotspot / Cập nhật 18/08/2026` và dòng version ở footer trang |
| `STEP-04` | `RQ-04` | cùng file trên | `'/ve-hrp'` → `'/ve-hrp.html'` ở 2 chỗ (card danh sách + CTA hero) |
| `STEP-05` | `RQ-05` | cùng file trên | Đọc lại sau khi cắt; bỏ `import Link from 'next/link'` đã thành vô dụng để lint sạch |
| `STEP-07a` | `RQ-07` | `app/layout.tsx`, `app/{admin,worker,vendor,ctv}/layout.tsx` | **Chỉ đọc `git diff` + xác nhận khớp `EV-09`/`DEC-06`. Không sửa 1 byte** |
| `STEP-07b` | `RQ-07` | `app/(jobs)/jobs/layout.tsx`, `app/(jobs)/track/layout.tsx` | **File mới**, 14 dòng mỗi file: chỉ `metadata.title` + `return <>{children}</>` |
| `STEP-07c` | `RQ-07` | `app/login/page.tsx` | Thêm `import type { Metadata }` + `export const metadata = { title: 'Đăng nhập' }` (+5 dòng, không đụng logic form) |
| `STEP-06` | `RQ-06` | 4 gate + `git status` | Chạy **cuối cùng** sau `STEP-07` theo thứ tự bắt buộc ở §5 TASK |
| — | — | `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/HANDOFF.md` | File này |

## 3. Nội dung thay đổi

### 3.1 `scripts/copy-static.mjs` (`git diff --numstat`: 6 thêm / 4 xoá)

Dòng bị xoá — chính là `EV-01`, gốc của lỗ rò:

```js
cpSync(join(root, 'docs'), join(pub, 'docs'), { recursive: true });
```

Còn lại: `mkdirSync(public)`, vòng lặp `cpSync` cho `index.html` + `ve-hrp.html`, rồi `rmSync(join(pub, 'docs'), { recursive: true, force: true })`. Comment đầu file nay giải thích **vì sao cố ý không copy `docs/`** (đó là nơi pipeline Tier 1/2/3 làm việc; publish ra web là rò rỉ) và ghi rõ `rmSync` là bước dọn artifact của build cũ. Chuỗi log mới:

```
[copy-static] ok: public/ đã sẵn sàng (index.html, ve-hrp.html)
```

— không còn kể `docs/`, đúng `RQ-01`. `cpSync` vẫn được dùng cho 2 file html nên không sinh import chết.

### 3.2 `app/(portal)/ve-chung-toi/page.tsx` (220 → 164 dòng, `git diff --numstat`: 12 thêm / 68 xoá)

Đã xoá hẳn 3 entry trong mảng `CARDS`:

| Card bị xoá | `href` cũ | Chuỗi nội bộ đi kèm |
|---|---|---|
| "Demo BoD — Mockup" | `/docs/tasks/hrp-v4-bod-mockup/mockup/index.html` | tag "Demo nội bộ" |
| "Roadmap V4" | `/roadmap-hrp-v4.html` | "Phase 5 ✅ ACCEPTED. P1 Portals ✅ ACCEPTED. P2 Commission ✅ ACCEPTED", tag "Chờ OP P1/P2" |
| "Roadmap: Portal Ecosystem" | `/roadmap-portals.html` | tag "Phase Mới Nhất" |

Đã xoá tiếp: CTA `<a href="/docs/tasks/hrp-v4-bod-mockup/mockup/index.html">Xem demo BoD — mockup hi-fi</a>`, cả khối meta-strip (`v4.22`, `Demo BoD: 36 frame hi-fi · 11 hotspot`, `Cập nhật 18/08/2026`), dòng footer `v4.22 · 18/08/2026` và footer-link `<a href="/docs/UNIFIED_PLAN_v4.md">UNIFIED_PLAN_v4.md</a>`.

Còn lại trên trang (đúng `RQ-05`/`DEC-03`):

- Hero: kicker "HRP — Hệ thống quản trị cung ứng nhân lực", headline "Một hệ thống cho toàn bộ nghiệp vụ *cung ứng nhân sự*", lede về chuỗi nghiệp vụ.
- 1 CTA: `<a href="/ve-hrp.html">Tìm hiểu về HRP</a>` (đổi từ `<Link href="/ve-hrp">`, nên `import Link` bị bỏ).
- 3 card: "Hệ quản trị HRP" → `/ve-hrp.html`; "Việc làm đang tuyển" → `/jobs` (**thêm mới, xem `DEV-01`**); "Tra cứu bảng công" → `https://www.hrpvietnam.vn/` (giữ nguyên từ bản cũ).
- Footer trang: tên thương hiệu + `mailto:contact@hrpartner.vn`.

`export const metadata` của trang **không bị đổi** — `git diff -U0` không có dòng `+/-` nào chạm `export const metadata`, `title:` hay `description:` của trang (exit 1), đúng ràng buộc §4.2.

### 3.3 5 file metadata đang dirty — tôi chỉ đọc và xác nhận (`STEP-07a`, `DEC-06`)

`git diff` thật khớp `EV-09`: `app/layout.tsx` chuyển `metadata` sang dạng object có `title.default = 'HRPartner'` + `template = '%s · HRPartner'`; 4 layout portal thêm title riêng.

| File | `metadata.title` trong bản dirty |
|---|---|
| `app/layout.tsx` | `{ default: 'HRPartner', template: '%s · HRPartner' }` |
| `app/admin/layout.tsx` | `Quản trị` (+ 1 dòng comment out-of-scope bỏ `appBCC/*`, `app/bcc/*` — giữ nguyên đúng §4.2) |
| `app/worker/layout.tsx` | `Người lao động` |
| `app/vendor/layout.tsx` | `Nhà cung cấp` |
| `app/ctv/layout.tsx` | `Cộng tác viên` |

Bằng chứng tôi không sửa gì thêm: `git diff --stat` của 5 file này đo lúc đầu phiên và lúc nộp giống hệt nhau (`admin 6`, `ctv 4`, `layout 10`, `vendor 4`, `worker 4`). `INV-05` giữ được: `apple-mobile-web-app-title: 'HRPartner Worker'` (dòng 32) và `manifest: '/manifest.json'` (dòng 34) vẫn nguyên, và không dòng `+/-` nào trong diff chạm 2 khoá đó.

### 3.4 Hai layout mới cho `/jobs` và `/track` (`STEP-07b`, `DEC-07`)

`app/(jobs)` trước đó **không có layout nào** (đúng `EV-14`), nên 2 file này là layout đầu tiên trên 2 route đó. Cả hai tối giản y hệt nhau, chỉ khác title:

```tsx
/**
 * Layout trong suốt cho /jobs — chỉ tồn tại để khai báo `metadata.title` (DEC-07).
 * Trang /jobs là Client Component nên không tự export metadata được.
 * KHÔNG thêm markup/provider/CSS: layout này phải không đổi UI hiện tại.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Việc làm',
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

`app/(jobs)/track/layout.tsx` giống hệt, `title: 'Tra cứu hồ sơ ứng tuyển'`, hàm `TrackLayout`. Vì thân layout chỉ là `<>{children}</>` — không thêm khung, không đổi spacing, không provider — nên stop condition "layout mới phải trong suốt về UI" được giữ; route table sau build vẫn báo `/jobs` và `/track` là `○` (prerendered static) như trước.

Tôi **không** thêm/bớt `'use client'` ở bất kỳ file nào (§4.2 cấm), 3 client page `/`, `/jobs`, `/track` vẫn là Client Component nguyên trạng.

### 3.5 `app/login/page.tsx` (`STEP-07c`, +5 dòng)

Chỉ thêm phần khai báo, đặt ngay trên component; `Suspense`, `LoginForm` và toàn bộ logic không đổi, `login-form.tsx` không bị chạm:

```tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập',
};
```

## 4. Evidence theo AC — lệnh, exit code, output thật

### Gate hợp lệ hoá contract (dòng bắt buộc theo template, `C-09` của Tier 3)

```
$ .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-02-public-surface-exposure\TASK.md
TASK CONTRACT CHECK: .\docs\tasks\hrp-v5-go-live-02-public-surface-exposure\TASK.md

RESULT: PASS. TASK contract is ready for execution.
VERIFY_TASK_EXIT=0
```

`verify-pipeline.ps1` tôi **không chạy được**: lệnh bị permission classifier của môi trường chặn (không phải lỗi script). Gate đó thuộc Tier 1/Tier 3 và TASK không giao cho tôi, nên tôi ghi lại đúng sự thật thay vì bỏ qua im lặng.

### `AC-01` PASS — build không sinh `public/docs`

Trước khi chạy, `public/docs` **có thật** trên máy tôi với 83 file (artifact do build cũ để lại), nên đây không phải bằng chứng rỗng.

```
$ node scripts/copy-static.mjs
[copy-static] ok: public/ đã sẵn sàng (index.html, ve-hrp.html)
COPY_STATIC_EXIT=0

$ ls public
index.html  logo.png  manifest.json  mockup  roadmap-hrp-v4.html  roadmap-portals.html  sw.js  ve-hrp.html
```

`public/docs` biến mất; `public/index.html` và `public/ve-hrp.html` vẫn còn. Chạy **lần hai từ trạng thái đã sạch** để chứng minh script không tự sinh lại:

```
$ node scripts/copy-static.mjs
[copy-static] ok: public/ đã sẵn sàng (index.html, ve-hrp.html)
COPY_STATIC_EXIT_2=0
$ [ -d public/docs ] && echo FAIL || echo OK
OK — vẫn không sinh public/docs (idempotent)
```

Sau `npm run build` cũng đã kiểm lại: `public/docs` vẫn không tồn tại. **Nói thẳng một điểm dễ hiểu sai** (chi tiết ở `LIM-02`): `npm run build` = `next build`, không có hook `prebuild`, nên bản thân lệnh này *không* chạy `copy-static`; đường chạy thật khi deploy là `buildCommand` trong `vercel.json` = `node scripts/copy-static.mjs && npx prisma generate && next build` — tức chính script tôi vừa sửa. Vì vậy tôi đo script trực tiếp (2 lần) thay vì dựa vào `npm run build`.

### `AC-03` PASS — không còn `href` `/docs/`

```
$ grep -n "/docs/" "app/(portal)/ve-chung-toi/page.tsx"
AC03_EXIT=1        # rỗng
```

### `AC-04` PASS — không còn jargon pipeline

Mỗi chuỗi grep riêng, `exit=1` nghĩa là không tìm thấy:

```
ACCEPTED         exit=1      v4.22            exit=1      DEC-             exit=1
P1 Portals       exit=1      36 frame         exit=1      STEP-            exit=1
P2 Commission    exit=1      11 hotspot       exit=1      AC-              exit=1
Chờ OP           exit=1      Moment           exit=1
```

Tôi quét thêm ngoài danh sách bắt buộc, dạng case-insensitive, cũng rỗng: `phase`, `roadmap`, `mockup`, `BoD`, `hi-fi` (đều `exit=1`).

### `AC-05` PASS — mọi link giới thiệu dùng `.html`

```
$ grep -n "ve-hrp" "app/(portal)/ve-chung-toi/page.tsx"
14:    href: '/ve-hrp.html',
80:              href="/ve-hrp.html"
AC05_EXIT=0

$ grep -nE "/ve-hrp['\"]" "app/(portal)/ve-chung-toi/page.tsx"
BARE_EXIT=1        # không còn '/ve-hrp' trần
```

Không thêm rewrite nào vào `vercel.json` — file này không nằm trong `git status` (xem `AC-08`).

### `AC-06` PASS (phần local) — trang vẫn render đủ nội dung

Build báo `├ ○ /ve-chung-toi   322 B   103 kB` (prerendered static, không `404`). Tôi đọc thẳng HTML prerender thật `.next/server/app/ve-chung-toi.html` (25.880 byte):

| Thứ phải còn | Kết quả |
|---|---|
| `/ve-hrp.html` | CÓ MẶT |
| `/jobs` | CÓ MẶT |
| `mailto:contact@hrpartner.vn` | CÓ MẶT |
| Headline "Một hệ thống cho toàn bộ nghiệp vụ" | CÓ MẶT |
| Card "Việc làm đang tuyển" | CÓ MẶT |

| Thứ phải hết | Kết quả |
|---|---|
| `/docs/`, `ACCEPTED`, `v4.22`, `36 frame`, `11 hotspot`, `roadmap-portals`, `roadmap-hrp-v4`, `mockup` | RỖNG (cả 8 chuỗi) |

Phần live (`/ve-chung-toi` trả `200` trên production) thuộc Owner sau deploy theo `DEC-05`.

### `AC-07` PASS — 3 gate hồi quy (+ build) exit 0

```
$ npm run typecheck        # tsc --noEmit
TYPECHECK_EXIT=0

$ npm run lint
✖ 492 problems (0 errors, 492 warnings)
LINT_EXIT=0

$ npm run test:unit
 Test Files  91 passed (91)
      Tests  1408 passed (1408)
   Duration  21.83s
TEST_UNIT_EXIT=0

$ npm run build
BUILD_EXIT=0
```

492 warning là mức nền của repo (chính sách eslint để rule stylistic ở `warn`), 0 error. Cả 4 lệnh chạy **sau** `STEP-07` đúng thứ tự bắt buộc.

### `AC-08` PASS — chỉ path trong §4.2 thay đổi

`git status --short` trước khi tôi bắt đầu có 24 dòng. Sau khi tôi xong: 29 dòng — đúng 5 dòng mới, tất cả nằm trong §4.2:

```
 M app/(portal)/ve-chung-toi/page.tsx     <- mới (STEP-02..05)
 M app/login/page.tsx                     <- mới (STEP-07c)
 M scripts/copy-static.mjs                <- mới (STEP-01)
?? app/(jobs)/jobs/layout.tsx             <- mới (STEP-07b)
?? app/(jobs)/track/layout.tsx            <- mới (STEP-07b)
 M app/admin/layout.tsx                   <- dirty sẵn, DEC-06, tôi chỉ đọc
 M app/ctv/layout.tsx                     <- dirty sẵn, DEC-06, tôi chỉ đọc
 M app/layout.tsx                         <- dirty sẵn, DEC-06, tôi chỉ đọc
 M app/vendor/layout.tsx                  <- dirty sẵn, DEC-06, tôi chỉ đọc
 M app/worker/layout.tsx                  <- dirty sẵn, DEC-06, tôi chỉ đọc
 M docs/PLANNER_HANDOVER.md               <- WIP luồng khác, KHÔNG chạm
?? .neon, docs/aff_plan*.md, scratch/** (13 file), scripts/debug-parser.mjs
                                          <- WIP luồng khác, KHÔNG chạm
```

`git diff --stat` các file tracked trong scope:

```
 app/(portal)/ve-chung-toi/page.tsx | 80 ++++++--------------------------------
 app/admin/layout.tsx               |  6 ++-
 app/ctv/layout.tsx                 |  4 ++
 app/layout.tsx                     | 10 +++--
 app/login/page.tsx                 |  5 +++
 app/vendor/layout.tsx              |  4 ++
 app/worker/layout.tsx              |  4 +-
 scripts/copy-static.mjs            | 10 +++--
 8 files changed, 45 insertions(+), 78 deletions(-)
```

Không `git add`, không `git add -A`, không commit, không reset/stash/restore file của luồng khác. `docs/PLANNER_HANDOVER.md` vẫn `20 dòng (10+/10-)` y như lúc đầu phiên. `vercel.json`, `public/**`, `app/components/GlobalNavbar.tsx`, `GlobalFooter.tsx`, `app/admin/**` (ngoài `layout.tsx`), `app/(portal)/layout.tsx` đều không xuất hiện trong `git status` ⇒ không bị sửa.

### `AC-09` PASS (4/5 title đo trên HTML render thật, `/admin` xem `LIM-01`)

```
$ grep -rn "Tra cứu Bảng công" app/
GREP_TITLE_EXIT=1        # rỗng
```

Title đọc trực tiếp bằng thẻ `<title>` trong HTML prerender thật (`.next/server/app/*.html`), không phải suy luận từ source:

| Route | File prerender | `<title>` đo được | `AC-09` yêu cầu |
|---|---|---|---|
| `/` | `index.html` | `HRPartner` | `HRPartner` ✔ |
| `/jobs` | `jobs.html` | `Việc làm · HRPartner` | `Việc làm · HRPartner` ✔ |
| `/track` | `track.html` | `Tra cứu hồ sơ ứng tuyển · HRPartner` | `Tra cứu hồ sơ ứng tuyển · HRPartner` ✔ |
| `/login` | `login.html` | `Đăng nhập · HRPartner` | `Đăng nhập · HRPartner` ✔ |
| `/admin` | *không có* (route `ƒ` động + role-guard) | không đo được local | `Quản trị · HRPartner` → `LIM-01` |

Ba layout portal cùng dạng với `admin` cho thấy cơ chế `template` hoạt động thật, đo trên HTML render:

```
/worker  -> Người lao động · HRPartner
/vendor  -> Nhà cung cấp · HRPartner
/ctv     -> Cộng tác viên · HRPartner
```

### `AC-02`, `AC-10`, phần live `AC-06` — thuộc Owner sau deploy (`DEC-05`)

Tôi không deploy và không đo production. Sau khi deploy, Owner cần curl:

- `AC-02`: `/docs/PLANNER_HANDOVER.md`, `/docs/UNIFIED_PLAN_v5.md`, `/docs/runbooks/marketplace-launch-operations.md`, `/docs/tasks/hrp-v5-ops-06a-marketplace-launch-hardening/TASK.md` → phải `404`. Nếu còn `200`, purge cache CDN rồi đo lại trước khi kết luận fail (`RISK-03`).
- `AC-10`: `/` và `/jobs` không còn title `Tra cứu Bảng công HRP`.
- `AC-06` (live): `/ve-chung-toi` trả `200`, còn hero + card `/ve-hrp.html` + card `/jobs` + liên hệ.
- Kèm luôn (thuộc `LIM-01`): đăng nhập admin rồi đọc title `/admin` → mong đợi `Quản trị · HRPartner`.

## 5. Invariants

| INV | Nội dung | Bằng chứng |
|---|---|---|
| `INV-01` | Không xoá file nào trong `docs/`, không thêm `docs/` vào `.gitignore` | `git status` không có dòng `D` nào dưới `docs/`; `.gitignore` không nằm trong `git status` |
| `INV-02` | Không xoá file tracked dưới `public/` | `git ls-files public \| wc -l` = **58** trước và sau, khớp `EV-07`; `git status -- public` rỗng |
| `INV-03` | Không đổi hành vi route Next nào khác | Chỉ bỏ nội dung + sửa href + thêm metadata; 2 layout mới chỉ render `children`; route table sau build vẫn đủ route, `/jobs`, `/track`, `/login`, `/ve-chung-toi` vẫn `○` |
| `INV-04` | Không thêm dependency, không thêm env var | `package.json`, `package-lock.json`, `.env*` không nằm trong `git status` |
| `INV-05` | Không đổi `apple-mobile-web-app-title` và `manifest` trong `app/layout.tsx` | Grep còn nguyên dòng 32/34; không dòng `+/-` nào trong diff chạm 2 khoá này |

## 6. Deviation — 4 điểm tôi phải khai, Tier 3/Tier 1 quyết

### `DEV-01` Tôi **thêm** 1 card mới trỏ `/jobs` (không chỉ xoá)

`RQ-05`/`AC-06` đòi trang còn "card trỏ `/jobs`", nhưng bản gốc **chưa từng có** card nào trỏ `/jobs`, còn §4.2 chỉ cho phép "bỏ card/CTA/footer-link nội bộ, sửa 2 href". Để đạt `AC-06` tôi thêm đúng **một** entry vào mảng `CARDS` đang có, dùng câu chữ mô tả đúng chức năng đã triển khai, không tạo component mới, không thêm dependency:

```tsx
{
  icon: '💼',
  title: 'Việc làm đang tuyển',
  desc: 'Danh sách vị trí đang tuyển, nộp hồ sơ trực tuyến và tra cứu tình trạng hồ sơ bằng mã theo dõi.',
  tag: 'Đang tuyển',
  tagStyle: 'ok',
  href: '/jobs',
  more: 'Xem việc làm →',
}
```

Đây là chỗ duy nhất tôi *viết chữ mới* trên trang. Nếu Tier 1 coi việc này là "sáng tác nội dung marketing" (`DEC-03` cấm) thì bỏ card đi sẽ làm `AC-06` fail — cần Tier 1 chốt câu chữ, tôi sẽ thay theo.

### `DEV-02` Tôi hoàn tác side-effect của chính mình trên `public/index.html`

`AC-01` buộc chạy `node scripts/copy-static.mjs`. Script đó (hành vi cũ, tôi không sửa phần này) copy `index.html` ở root đè lên `public/index.html` — file này **được tracked** và bản trong commit đã cũ (lệch 97+/59-, title còn bị mojibake). Vì vậy sau khi chạy script, `public/index.html` bị dirty, mà `public/**` là **ngoài scope**.

Tôi đã xác minh nguồn gốc trước khi xử lý: `diff index.html public/index.html` → exit 0 (giống hệt) ⇒ delta đúng là bản copy của `cpSync`, không phải sửa của ai. Sau đó tôi chạy `git checkout -- public/index.html` (exit 0) để đưa **duy nhất file đó** về HEAD. Đây là hoàn tác side-effect do chính tôi tạo ra trong phiên này, **không** phải reset/stash/restore file của luồng khác (`RISK-01` cấm điều đó), không xoá file nào, `git ls-files public` vẫn 58.

### `DEV-03` Tôi **không** commit

`DEC-06` viết "commit path-scoped cùng task". Tôi không tự commit vì: (a) `.ai-pipeline/tier2.md` cấm commit khi TASK/sếp không yêu cầu rõ, (b) `AC-08` đo bằng `git status --short` + `git diff --stat` — tức giả định cây còn dirty lúc audit, (c) commit là bước `PROCESS-02` sau khi ACCEPTED. 5 file metadata vẫn dirty, nội dung y nguyên, sẵn sàng cho commit path-scoped. Nếu sếp muốn tôi commit ngay, ra lệnh riêng, tôi sẽ chỉ stage 8 path tracked + 2 file mới trong §4.2.

### `DEV-04` Title `/ve-chung-toi` render dài thêm hậu tố ` · HRPartner`

Non-goal ghi "không đổi title trang `/ve-chung-toi`". Tôi **không** sửa `metadata` của trang (bằng chứng ở §3.2), nhưng vì `app/layout.tsx` (bản `DEC-06`) khai báo `template: '%s · HRPartner'`, title render nay là `Về HRP — Hệ thống quản trị cung ứng nhân lực · HRPartner`. Đây là hệ quả của cơ chế template, không phải edit của tôi. Nếu Owner muốn giữ đúng chuỗi cũ thì phải dùng `title: { absolute: ... }` trong page — việc đó là sửa `metadata` của trang, §4.2 cấm, nên tôi để nguyên và báo lên.

## 7. Limitation

### `LIM-01` Title `/admin` không đo được bằng HTML render trên máy local

`/admin` là route `ƒ` (dynamic) vì `app/admin/layout.tsx` có `export const dynamic = 'force-dynamic'` + role-guard `getServerSession` → `redirect` khi chưa đăng nhập, nên build không sinh HTML nào dưới `.next/server/app/admin` (`find ... -name "*.html"` rỗng). Muốn đọc `<title>` thật của `/admin` phải có session admin hợp lệ; tôi không tạo/dùng credential và không chạy server đụng DB production.

Bằng chứng tôi nộp thay thế, gồm 2 lớp: (a) source `app/admin/layout.tsx` export `metadata.title = 'Quản trị'`; (b) cơ chế `template` đã được chứng minh **thật** trên 3 layout portal cùng dạng (`/worker`, `/vendor`, `/ctv` render đúng `X · HRPartner`). Suy ra `/admin` sẽ là `Quản trị · HRPartner`. Việc xác nhận cuối cùng nên gộp vào admin smoke của Owner (đi cùng `AC-10`).

### `LIM-02` `npm run build` không chạy `copy-static` — đừng dùng nó làm bằng chứng `AC-01`

`package.json` có `"build": "next build"` và **không** có hook `prebuild`. Đường chạy sinh `public/` là `buildCommand` trong `vercel.json`: `node scripts/copy-static.mjs && npx prisma generate && next build`. Nên "sau `npm run build` không thấy `public/docs`" chỉ chứng minh *không có gì khác tái sinh nó*; bằng chứng `AC-01` đúng là 2 lần chạy script trực tiếp ở §4.

### `LIM-03` Không có test tự động chặn hồi quy lỗ rò này

Task không yêu cầu, tôi không tự mở scope. Hiện tại nếu ai đó thêm lại `cpSync(docs → public/docs)` thì không gate nào bắt được — chỉ có comment cảnh báo trong `scripts/copy-static.mjs`. Nếu Tier 1 muốn một unit test kiểu "script không được ghi vào `public/docs`", đó là task riêng.

## 8. Observation — báo cáo, tôi không tự mở scope

- `OBS-01` (stop condition #3 của TASK) **Không file nào khác trên bề mặt công khai link `/docs/**`**. Tôi quét `index.html` và `ve-hrp.html` ở root: 0 hit. Match duy nhất còn lại trong repo là asset nhị phân `public/mockup/F80_DemoExport.pdf` — bên trong PDF có nhúng chuỗi đường dẫn tài liệu nội bộ, nhưng đó không phải link bấm được trên site. Thuộc vùng `RISK-04`/`DEC-04`, chỉ báo cáo.
- `OBS-02` `public/index.html` bản trong commit đã cũ so với `index.html` ở root (lệch 97+/59-, title còn mojibake `HRP â€” Há»‡ thá»‘ng...`). Hệ quả: mỗi lần chạy `copy-static` là file tracked này dirty (xem `DEV-02`), và bản deploy khác bản trong git. Ngoài scope (`public/**`); nên mở task riêng để hoặc untrack, hoặc refresh nó.
- `OBS-03` `tagStyle: 'wip'` giờ không card nào dùng nữa, nhưng tôi giữ nguyên ternary trong renderer — xoá nhánh đó là dọn dead-code ngoài yêu cầu, không cần thiết cho AC nào.
- `OBS-04` Card "Tra cứu bảng công" vẫn dùng chữ "bảng lương A–E" và trỏ site cũ `https://www.hrpvietnam.vn/`. Tôi để nguyên: chuỗi "A–E" không nằm trong danh sách đóng của `RQ-03`, và `DEC-03` cấm tôi viết lại nội dung marketing.
- `OBS-05` `app/(jobs)` vẫn không có layout cấp group; 2 route `/jobs`, `/track` do đó không có navbar/footer chung — đúng như trước task này, tôi không đổi (thêm navbar vào đó sẽ vi phạm stop condition "layout mới phải trong suốt về UI").

## 9. Rollback

Không migration, không env, không data, không thao tác phá huỷ. Muốn quay lại: `git checkout -- scripts/copy-static.mjs "app/(portal)/ve-chung-toi/page.tsx" app/login/page.tsx` và xoá 2 file layout mới; nếu đã commit thì `git revert` commit của task là đủ.

## 10. Ranh giới tôi giữ

Không sửa `TASK.md`, không viết `AUDIT.md`, không tự tuyên bố pass/accepted. Không commit/push/merge/deploy. Không `git add -A`. Không chạm `vercel.json`, `public/**` (ngoài việc hoàn tác side-effect ở `DEV-02`), `app/components/GlobalNavbar.tsx`, `GlobalFooter.tsx`, `app/admin/**` ngoài `layout.tsx`, `app/(portal)/layout.tsx`, `login-form.tsx`. Không thêm/bớt `'use client'`. Không thêm dependency/env var. Không chạm WIP của luồng khác (`docs/PLANNER_HANDOVER.md`, `docs/aff_plan*`, `.neon`, `scratch/**`, `scripts/debug-parser.mjs`). Không đọc/in giá trị biến môi trường.

## 11. Execution Round History

| Round | Spec version | Status | Tóm tắt |
|---|---|---|---|
| `1` | `v1.1` | `READY_FOR_AUDIT` | Bỏ copy `docs/` khỏi `copy-static`; dọn card/CTA/footer-link nội bộ + jargon trên `/ve-chung-toi`; repoint `/ve-hrp.html`; nhận 5 file metadata dirty theo `DEC-06` + thêm 2 layout `/jobs`, `/track` và `metadata` cho `/login` theo `DEC-07`. 8 AC Tier 2 PASS, 4 deviation khai ở §6, 3 limitation ở §7 |

Handoff status: READY_FOR_AUDIT
