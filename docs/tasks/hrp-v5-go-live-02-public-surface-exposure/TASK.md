# TASK: hrp-v5-go-live-02-public-surface-exposure

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-02-public-surface-exposure` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.1` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — độc lập |
| Baseline | `ad79d72` trên `main` |
| Modules | `M2` public surface + build config + metadata title |
| ADR references | None |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `Owner push main → deploy → đo AC-02/AC-10/live AC-06 → công bố link` |
| Updated | `2026-08-29 15:05 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Người lạ truy cập `www.hrpartner.vn` trước ngày công bố **không đọc được tài liệu nội bộ của pipeline** và **không thấy jargon nội bộ** trên trang công khai:

- `/docs/**` (TASK/HANDOFF/AUDIT, UNIFIED_PLAN, runbook vận hành, PLANNER_HANDOVER) trả `404` thay vì `200`.
- Trang "Về chúng tôi" — trang nằm trong navbar và footer của **mọi** trang công khai — không còn card/CTA/footer-link trỏ tới bản mockup nội bộ, roadmap nội bộ hay master plan, và không còn chuỗi trạng thái pipeline kiểu "Phase 5 ACCEPTED", "Chờ OP P1/P2", "v4.22", "36 frame hi-fi".
- CTA "Tìm hiểu về HRP" không còn dẫn tới trang `404`.
- **Tiêu đề tab trình duyệt không còn là "Tra cứu Bảng công HRP" trên mọi trang.** Trang chủ và trang việc làm mang tên HRPartner; mỗi portal (quản trị, người lao động, nhà cung cấp, cộng tác viên) có tiêu đề riêng.

### Non-goals

- Không đụng `vercel.json` (rewrite `/` sang `/index.html` hiện đã vô hiệu vì route Next thắng; xử lý sau).
- Không viết lại nội dung marketing mới cho trang "Về chúng tôi"; chỉ bỏ phần không an toàn.
- Không xoá `docs/` khỏi repo — đó là nơi pipeline Tier 1/2/3 làm việc.
- Không ẩn `/mockup/**`, `/roadmap-hrp-v4.html`, `/roadmap-portals.html`, `/index.html` khỏi truy cập trực tiếp bằng URL.
- Không đụng bất cứ trang `/admin/**` nào ngoài việc thêm `metadata.title` cho layout — phần còn lại thuộc `hrp-v5-go-live-03-admin-surface-truth`.
- Không đổi `public/manifest.json`, không đổi `apple-mobile-web-app-title`, không đổi title của `public/index.html` và `public/ve-hrp.html` (3 chuỗi này đã đúng nghĩa hoặc thuộc PWA Worker).
- Không đổi title trang `/ve-chung-toi` (trang này đã có metadata riêng đúng nghĩa).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `scripts/copy-static.mjs:16` | `cpSync(root/docs → public/docs, recursive)` chạy trong `buildCommand` của `vercel.json` mỗi lần build | Nguyên nhân gốc: toàn bộ `docs/` thành asset public |
| `EV-02` | curl 2026-08-29 | `/docs/PLANNER_HANDOVER.md` `200`; `/docs/UNIFIED_PLAN_v5.md` `200`; `/docs/runbooks/marketplace-launch-operations.md` `200`; `/docs/tasks/hrp-v5-ops-06a-marketplace-launch-hardening/TASK.md` `200` | Tài liệu nội bộ đang public thật, không phải suy luận |
| `EV-03` | `app/(portal)/ve-chung-toi/page.tsx:25`, `:100`, `:200` | 3 href trỏ `/docs/...`: card mockup, CTA hero, footer "Dựng từ UNIFIED_PLAN_v4.md" | Trang công khai link thẳng artifact nội bộ |
| `EV-04` | cùng file `:31`, `:32`, `:41`, `:122-129`, `:195` | "Phase 5 ✅ ACCEPTED. P1 Portals ✅ ACCEPTED. P2 Commission ✅ ACCEPTED", tag "Chờ OP P1/P2", "Phase Mới Nhất", "v4.22", "Demo BoD: 36 frame hi-fi · 11 hotspot", footer "v4.22 · 18/08/2026" | Jargon pipeline hiển thị cho khách |
| `EV-05` | `app/components/GlobalNavbar.tsx:22`, `app/components/GlobalFooter.tsx:4` | Cả navbar và footer đều link `/ve-chung-toi` | Trang này xuất hiện ở mọi trang công khai, không phải trang ẩn |
| `EV-06` | curl 2026-08-29 | `/ve-hrp` = `404`, `/ve-hrp.html` = `200` (do `cleanUrls: false`) | CTA "Tìm hiểu về HRP" đang chết |
| `EV-07` | `git ls-files public` (58 file) + `.gitignore:56-58` | `public/mockup/**`, `public/roadmap-hrp-v4.html`, `public/roadmap-portals.html` được tracked; chỉ `public/index.html`, `public/ve-hrp.html`, `public/docs/` bị ignore | `docs/` là build artifact; mockup/roadmap là nội dung public cố ý — chỉ cần bỏ copy `docs/` |
| `EV-08` | curl 2026-08-29 | `/mockup/index.html` `200`, `/mockup/F00_Cover.html` `200` | Bỏ link mockup khỏi trang công khai KHÔNG làm mất khả năng demo BoD qua URL trực tiếp |
| `EV-09` | `git diff app/layout.tsx` + `git log`, đo lại 2026-08-29 14:00 | Working tree đã có bản sửa metadata (`title.default` = `HRPartner`, `template` = `%s · HRPartner`) cùng 4 layout portal thêm title riêng, nhưng **chưa commit** (HEAD vẫn là `ad79d72`, nội dung commit vẫn là `title: 'Tra cứu Bảng công HRP'`) | Bản sửa tồn tại nhưng chưa deploy — đây là lý do production vẫn sai. `v1.0` từng để việc này out of scope vì tưởng luồng khác đang xử lý; không luồng nào commit nên `v1.1` nhận việc |
| `EV-10` | `npm run` scripts | `typecheck`, `lint`, `test:unit`, `build` tồn tại | Gate hồi quy dùng đúng tên script này |
| `EV-11` | curl 2026-08-29 14:00, đọc thẻ title | `/` = `Tra cứu Bảng công HRP`; `/jobs` = `Tra cứu Bảng công HRP`; `/admin` (307) = `Tra cứu Bảng công HRP`; `/ve-chung-toi` = `Về HRP — Hệ thống quản trị cung ứng nhân lực`; `/index.html` và `/ve-hrp.html` có title riêng đúng nghĩa | Chỉ trang Next thiếu title bị ảnh hưởng; 2 file tĩnh không cần sửa |
| `EV-12` | grep `export const metadata` và `export async function generateMetadata` trong `app/**/{page,layout}.tsx` | Chỉ 6 file khai báo metadata: `app/layout.tsx` + 4 layout portal (cả 5 đều là bản chưa commit ở `EV-09`) + `app/(portal)/ve-chung-toi/page.tsx` | Mọi trang khác thừa hưởng title gốc — đó là lý do "trang nào cũng cùng một title" |
| `EV-13` | `git ls-files app --others --exclude-standard` cho page.tsx | Không có route động cấp trang (không có `app/(jobs)/jobs/[slug]/page.tsx`); trang công khai là `app/(portal)/page.tsx` (`/`), `app/(jobs)/jobs/page.tsx`, `app/(jobs)/track/page.tsx`, `app/login/page.tsx` | Danh sách trang cần title là hữu hạn và xác định |
| `EV-14` | grep `'use client'` + đọc file, 2026-08-29 14:05 | `app/(portal)/page.tsx`, `app/(jobs)/jobs/page.tsx`, `app/(jobs)/track/page.tsx` đều là Client Component (dòng 1 `'use client'`) nên KHÔNG export `metadata` được; `app/login/page.tsx` là Server Component (bọc `LoginForm` client trong `Suspense`) nên export được. `app/(portal)/layout.tsx` tồn tại và là Server Component; **không có** `app/(jobs)/layout.tsx` | Quyết định cách gắn title phải theo từng trang, không nhồi metadata vào client page (`DEC-07`) |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Dừng `cpSync` `docs/` sang `public/`; giữ `rmSync(public/docs)` để mỗi build tự dọn artifact cũ. Không xoá `docs/` khỏi repo | Tier 1 / `EV-01`, `EV-07` | Chốt 2026-08-29 |
| `DEC-02` | CHOSEN | Bỏ hẳn card/CTA/footer-link nội bộ khỏi trang công khai, KHÔNG repoint sang `/mockup/index.html`. Lý do: trang khách hàng không quảng bá bản mockup nội bộ; sếp vẫn gửi được link demo BoD trực tiếp theo `EV-08` | Tier 1 / `EV-04`, `EV-08` | Chốt 2026-08-29, Owner có thể đổi trước khi Tier 2 bắt đầu |
| `DEC-03` | CHOSEN | Giữ `/ve-chung-toi` trong navbar/footer, chỉ để lại phần khách hàng đọc được (hero, card "Hệ quản trị HRP" trỏ `/ve-hrp.html`, card "Tra cứu bảng công", liên hệ). Không sáng tác nội dung marketing mới trong task này | Tier 1 / `EV-05` | Chốt 2026-08-29 |
| `DEC-04` | CHOSEN | `/mockup/**`, `/roadmap-hrp-v4.html`, `/roadmap-portals.html`, `/index.html` vẫn truy cập được bằng URL trực tiếp sau task này — residual đã ghi ở `RISK-04`, muốn ẩn thì mở task riêng | Tier 1 / `EV-07` | Chốt 2026-08-29 |
| `DEC-05` | CHOSEN | Deploy production KHÔNG thuộc Tier 2 (UNIFIED_PLAN §9.1). `AC-02` và phần live của `AC-06` do Owner chạy sau deploy; Tier 3 audit cơ chế + evidence local | Tier 1 | Chốt 2026-08-29 |
| `DEC-06` | CHOSEN | Nhận luôn 5 file metadata đang dirty trong working tree (`EV-09`) vào scope task này thay vì chờ luồng khác. Giữ **nguyên nội dung** bản đã có (`HRPartner` + template, 4 title portal) — Tier 2 chỉ đọc, xác nhận, rồi commit path-scoped cùng task, không viết lại chuỗi khác | Tier 1 / `EV-09`, `EV-11` | Chốt 2026-08-29 (spec v1.1) |
| `DEC-07` | CHOSEN | Title cho trang công khai, đã tính đến việc `/`, `/jobs`, `/track` là Client Component nên KHÔNG export `metadata` được (`EV-14`): (a) `/` giữ mặc định `HRPartner` từ root — trang chủ mang tên thương hiệu là đúng quy ước, không thêm file; (b) `/jobs` và `/track` thêm layout Server Component mới ở đúng thư mục route, title lần lượt `Việc làm` và `Tra cứu hồ sơ ứng tuyển`; (c) `/login` là Server Component nên export `metadata` ngay trong page, title `Đăng nhập`. Template `%s · HRPartner` tự ghép. Chuỗi là quyết định Tier 1, Tier 2 không tự đổi | Tier 1 / `EV-12`, `EV-13`, `EV-14` | Chốt 2026-08-29 |
| `DEC-08` | CHOSEN | Không đổi `public/manifest.json` trong task này dù root layout khai báo manifest của Worker PWA cho mọi trang. Residual ghi ở `RISK-06`; tách task riêng nếu Owner muốn PWA cho trang khách | Tier 1 | Chốt 2026-08-29 |

## 4. Contract

### 4.1 Requirements

| RQ | Requirement | Bắt buộc |
|---|---|---|
| `RQ-01` | Build không được sinh `public/docs/`. `scripts/copy-static.mjs` phải bỏ bước copy `docs/` sang `public/docs/`, vẫn giữ bước `rmSync(public/docs)` để build sau tự xoá artifact cũ, vẫn copy `index.html` và `ve-hrp.html` như hiện tại. Log và comment của script phải nói đúng việc nó làm (không còn kể "docs/") | MUST |
| `RQ-02` | `app/(portal)/ve-chung-toi/page.tsx` không còn bất kỳ `href` nào bắt đầu bằng `/docs/`, không còn link tới `roadmap-hrp-v4.html`, `roadmap-portals.html`, `/mockup/`. Cụ thể phải bỏ: card "Demo BoD — Mockup", card roadmap nội bộ, và dòng footer link `UNIFIED_PLAN_v4.md` | MUST |
| `RQ-03` | Không còn chuỗi nội bộ hiển thị cho khách trên trang này: `ACCEPTED`, `Phase` (theo nghĩa phase pipeline), `P1 Portals`, `P2 Commission`, `Chờ OP`, `v4.22`, `36 frame`, `11 hotspot`, `Moment`, `DEC-`, `STEP-`, `AC-`. Phần meta-strip và footer version cũng phải bỏ hoặc thay bằng nội dung khách hàng đọc được | MUST |
| `RQ-04` | Mọi link tới trang giới thiệu hệ quản trị phải dùng `/ve-hrp.html` (đúng `cleanUrls: false`), gồm card trong danh sách và CTA "Tìm hiểu về HRP". Không thêm rewrite mới vào `vercel.json` để đạt mục tiêu này | MUST |
| `RQ-05` | Trang `/ve-chung-toi` vẫn render được, vẫn giữ navbar/footer chung, vẫn còn ít nhất: hero giới thiệu HRP, card trỏ `/ve-hrp.html`, card trỏ `/jobs`, thông tin liên hệ. Không được xoá trắng trang hoặc trả `404` | MUST |
| `RQ-06` | Không hồi quy: `npm run typecheck`, `npm run lint`, `npm run test:unit` exit 0. Không sửa file ngoài scope ở `STEP-06` | MUST |
| `RQ-07` | Tiêu đề tab không còn là "Tra cứu Bảng công HRP" ở bất kỳ trang Next nào. Cụ thể: (a) commit nguyên bản 5 file metadata đang dirty theo `DEC-06`; (b) thêm `metadata.title` cho 4 trang công khai theo `DEC-07`; (c) sau task, grep `Tra cứu Bảng công` trong `app/**` trả rỗng | MUST |

### 4.2 Scope file

| File | Được phép làm gì |
|---|---|
| `scripts/copy-static.mjs` | Bỏ 1 lệnh copy `docs/`, sửa comment + log |
| `app/(portal)/ve-chung-toi/page.tsx` | Bỏ card/CTA/footer-link nội bộ, sửa 2 href `/ve-hrp` thành `/ve-hrp.html`, bỏ chuỗi jargon. KHÔNG đổi `metadata` của trang |
| `app/layout.tsx` | Chỉ nhận bản dirty đang có (`DEC-06`); không sửa thêm |
| `app/admin/layout.tsx`, `app/worker/layout.tsx`, `app/vendor/layout.tsx`, `app/ctv/layout.tsx` | Chỉ nhận bản dirty đang có: thêm `metadata.title`. Bản dirty của `app/admin/layout.tsx` còn sửa một dòng comment out-of-scope (bỏ `appBCC/*`, `app/bcc/*`) — giữ nguyên, không mở rộng |
| `app/(jobs)/jobs/layout.tsx`, `app/(jobs)/track/layout.tsx` | **File mới**: layout Server Component tối giản, chỉ export `metadata` theo `DEC-07` và render `children`. Không thêm markup, không thêm provider, không đụng CSS |
| `app/login/page.tsx` | Chỉ thêm export `metadata` với title `Đăng nhập`. Không đụng logic form, không đụng `login-form.tsx` |
| `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/HANDOFF.md` | Tier 2 viết mới |

Ngoài danh sách trên: **không sửa**. Đặc biệt `vercel.json`, `public/**` (gồm `manifest.json`, `index.html`, `ve-hrp.html`), `app/admin/**` (trừ `layout.tsx` nêu trên), `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx`, `app/bod/**`, `app/job-board/**`, `app/(portal)/layout.tsx`, và mọi trang Client Component đều out of scope. **Cấm** thêm/bớt directive `'use client'` ở bất kỳ file nào để nhét metadata.

### 4.3 Invariants

- `INV-01` Không xoá file nào trong `docs/` của repo và không thêm `docs/` vào `.gitignore`.
- `INV-02` Không xoá file tracked nào dưới `public/` (`git ls-files public` trước và sau phải giống nhau).
- `INV-03` Không đổi hành vi route Next nào khác; task này chỉ bỏ nội dung, sửa href và thêm metadata.
- `INV-04` Không thêm dependency, không thêm env var.
- `INV-05` Không đổi `apple-mobile-web-app-title` và `manifest` trong `app/layout.tsx` — giữ đúng bản dirty hiện có.

### 4.4 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-01 | AC-01, AC-02 |
| `RQ-02` | STEP-02 | AC-03 |
| `RQ-03` | STEP-03 | AC-04 |
| `RQ-04` | STEP-04 | AC-05 |
| `RQ-05` | STEP-05 | AC-06 |
| `RQ-06` | STEP-06 | AC-07, AC-08 |
| `RQ-07` | STEP-07 | AC-09, AC-10 |

## 5. Execution Plan

| STEP | Việc | Evidence Tier 2 phải nộp |
|---|---|---|
| `STEP-01` | Sửa `scripts/copy-static.mjs`: bỏ dòng `cpSync(join(root, 'docs'), join(pub, 'docs'), ...)`, giữ `rmSync`, cập nhật comment đầu file và chuỗi `console.log` cho khớp thực tế | `git diff` của file; chạy `node scripts/copy-static.mjs` rồi `dir public` chứng minh `public/docs` không tồn tại |
| `STEP-02` | Bỏ khỏi `ve-chung-toi/page.tsx` mọi entry trỏ `/docs/...` (card mockup, card roadmap nội bộ, CTA hero, footer link master plan) | `git diff`; grep `/docs/` trên file trả rỗng |
| `STEP-03` | Bỏ chuỗi jargon pipeline theo `RQ-03`, gồm meta-strip "v4.22 / 36 frame hi-fi / 11 hotspot / Cập nhật 18/08/2026" và dòng version ở footer trang | `git diff`; grep từng chuỗi ở `AC-04` trả rỗng |
| `STEP-04` | Đổi 2 chỗ `'/ve-hrp'` thành `'/ve-hrp.html'` (card danh sách + CTA) | `git diff`; grep `/ve-hrp'` trả rỗng |
| `STEP-05` | Đọc lại trang sau khi cắt: đảm bảo còn hero, card `/ve-hrp.html`, card `/jobs`, liên hệ; xoá import/biến không còn dùng để lint sạch | Trích đoạn file sau sửa |
| `STEP-06` | Gate hồi quy: `npm run typecheck`, `npm run lint`, `npm run test:unit`; `npm run build` nếu môi trường cho phép | Lệnh + exit code + đuôi output; `git status --short` chứng minh chỉ file trong §4.2 đổi |
| `STEP-07` | Title: (a) đọc `git diff` 5 file metadata đang dirty, xác nhận nội dung khớp `DEC-06` rồi nhận vào commit của task, KHÔNG viết lại; (b) tạo `app/(jobs)/jobs/layout.tsx` và `app/(jobs)/track/layout.tsx` theo `DEC-07`; (c) thêm `metadata` vào `app/login/page.tsx` | `git diff` 5 file dirty (chứng minh không sửa gì thêm); nội dung 2 file layout mới; grep `Tra cứu Bảng công` trong `app/**` trả rỗng; title render local cho `/`, `/jobs`, `/track`, `/login`, `/admin` |

Thứ tự bắt buộc: `STEP-01` độc lập, `STEP-02..05` cùng một file nên làm liền mạch, `STEP-07` trước `STEP-06`, và `STEP-06` (gate) chạy cuối cùng.

**Stop condition** — Tier 2 dừng và báo Tier 1, không tự quyết:

- Nếu bỏ card/CTA làm trang trống nghĩa (không còn nội dung nào cho khách) thì dừng, vì viết nội dung marketing mới là quyết định của Owner (`DEC-03`).
- Nếu `npm run build` fail vì thiếu env/DB: ghi `ENV_BLOCKED` với log thật, KHÔNG mock, KHÔNG sửa config để lách.
- Nếu phát hiện file khác cũng link `/docs/**`: ghi lại trong HANDOFF, không tự mở rộng scope.
- Nếu nội dung 5 file dirty ở `STEP-07a` KHÔNG khớp mô tả `EV-09` (ai đó đã sửa tiếp, hoặc đã commit, hoặc mất): dừng và báo Tier 1 kèm `git diff` thật. KHÔNG tự đoán ý bản sửa và KHÔNG tự viết lại chuỗi title.
- Nếu thêm layout mới cho `/jobs` hoặc `/track` làm đổi layout hiển thị (mất/thêm khung, đổi spacing): dừng — layout mới phải trong suốt về UI.

## 6. Acceptance

| AC | Điều kiện | Cách đo | Owner |
|---|---|---|---|
| `AC-01` | Sau khi chạy `node scripts/copy-static.mjs` trên máy sạch, `public/docs` không tồn tại; `public/index.html` và `public/ve-hrp.html` vẫn có | Chạy script, liệt kê `public/` | Tier 2 |
| `AC-02` | Sau deploy production: `/docs/PLANNER_HANDOVER.md`, `/docs/UNIFIED_PLAN_v5.md`, `/docs/runbooks/marketplace-launch-operations.md`, `/docs/tasks/hrp-v5-ops-06a-marketplace-launch-hardening/TASK.md` đều trả `404` | curl 4 URL, ghi status | Owner (sau deploy) |
| `AC-03` | `grep -n "/docs/" app/(portal)/ve-chung-toi/page.tsx` trả rỗng | grep + exit code | Tier 2 |
| `AC-04` | grep các chuỗi `ACCEPTED`, `P1 Portals`, `P2 Commission`, `Chờ OP`, `v4.22`, `36 frame`, `11 hotspot` trên file trang đều trả rỗng | grep từng chuỗi | Tier 2 |
| `AC-05` | `grep -n "ve-hrp" app/(portal)/ve-chung-toi/page.tsx` chỉ ra các dòng có `.html`; không còn `'/ve-hrp'` trần | grep | Tier 2 |
| `AC-06` | `/ve-chung-toi` vẫn `200` và còn hero + card `/ve-hrp.html` + card `/jobs` + liên hệ | Local dev hoặc build output; live check sau deploy do Owner | Tier 2 (local) + Owner (live) |
| `AC-07` | `npm run typecheck` exit 0, `npm run lint` exit 0, `npm run test:unit` exit 0 | Log 3 lệnh | Tier 2 |
| `AC-08` | `git status --short` chỉ hiện các path ở §4.2 trong phần thay đổi của task này; các file dirty của luồng khác giữ nguyên nội dung | `git status --short` trước/sau + `git diff --stat` | Tier 2 |
| `AC-09` | `rg "Tra cứu Bảng công" app` trả rỗng; title render local: `/` = `HRPartner`, `/jobs` = `Việc làm · HRPartner`, `/track` = `Tra cứu hồ sơ ứng tuyển · HRPartner`, `/login` = `Đăng nhập · HRPartner`, `/admin` = `Quản trị · HRPartner` | grep + đọc thẻ title trên build/dev local | Tier 2 |
| `AC-10` | Sau deploy: `/` và `/jobs` không còn title `Tra cứu Bảng công HRP` | curl 2 URL, đọc thẻ title | Owner (sau deploy) |

### Definition of Done

`AC-01`, `AC-03`, `AC-04`, `AC-05`, `AC-06` (phần local), `AC-07`, `AC-08`, `AC-09` PASS bằng evidence thật là đủ để `READY_FOR_AUDIT`. `AC-02`, `AC-10` và phần live của `AC-06` do Owner xác nhận sau deploy (`DEC-05`); Tier 3 audit cơ chế bằng `AC-01` và `AC-09` chứ không được force-pass live.

## 7. Risk và Rollback

| ID | Risk | Mức | Xử lý |
|---|---|---|---|
| `RISK-01` | Working tree là shared tree; ngoài 5 file metadata đã nhận vào scope (`DEC-06`) còn file dirty khác của luồng khác (`docs/aff_plan.md`, `scratch/**`) | Cao | Chỉ stage path trong §4.2; cấm `git add -A`; cấm reset/stash/restore file ngoài scope (`AC-08`) |
| `RISK-06` | Root layout khai báo `manifest: '/manifest.json'` cho MỌI trang, mà manifest đó là PWA của Worker (`name: HRPartner Worker`, `start_url: /worker`) — khách cài PWA từ trang việc làm sẽ thấy tên Worker | Thấp | Residual theo `DEC-08`; không sửa trong task này, mở task riêng nếu Owner muốn |
| `RISK-02` | Bỏ card làm layout grid trống lệch | Thấp | `STEP-05` kiểm tra lại render; nếu trống nghĩa thì dừng theo stop condition |
| `RISK-03` | CDN/Vercel còn cache `/docs/**` sau deploy nên vẫn thấy `200` | Trung bình | Owner đo lại sau khi deploy xong; nếu vẫn `200` thì purge cache rồi đo lại trước khi kết luận fail |
| `RISK-04` | Residual: `/mockup/**`, `/roadmap-hrp-v4.html`, `/roadmap-portals.html`, `/index.html` vẫn public qua URL trực tiếp | Trung bình | Chấp nhận theo `DEC-04`; ai muốn ẩn thì mở task riêng — task này không tự quyết |
| `RISK-05` | Ai đó đang bookmark link `/docs/...` để đọc kế hoạch | Thấp | Nội dung vẫn nằm trong repo cho người trong pipeline; khách không phải đối tượng đọc |

**Rollback:** `git revert` commit của task (không migration, không env, không data) là đủ. Không có thao tác phá huỷ nào trong task này.

## 8. Open Questions

Không còn. `DEC-02` (bỏ hẳn thay vì repoint sang `/mockup/index.html`) là quyết định của Tier 1 và Owner có thể đổi trước khi Tier 2 bắt đầu; nếu đổi thì Tier 1 tăng spec version.

## 9. Planner Resolution

### Audit round 1 — 2026-08-29, verdict `PASS`, Tier 1 kết luận `ACCEPTED`

Gate cơ học: `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/hrp-v5-go-live-02-public-surface-exposure/TASK.md` → `RESULT: PASS`, exit 0. `AUDIT.md` 5361 byte, có Verdict, đã commit `d2a9497` (commit này chỉ chứa `AUDIT.md`).

Vì `verify-audit.ps1` chỉ kiểm tra cấu trúc (tiền lệ OPS-04a: gate xanh vẫn để lọt P0), Tier 1 tự đo lại toàn bộ AC đo được ở local trước khi ghi ACCEPTED:

| AC | Tier 1 đo độc lập | Kết quả |
|---|---|---|
| `AC-01` | `Test-Path public/docs` = False; `public/index.html` và `public/ve-hrp.html` = True; đọc `scripts/copy-static.mjs` xác nhận dòng `cpSync(docs)` đã bỏ, `rmSync(public/docs)` còn nguyên | PASS |
| `AC-03` | `git grep -n "/docs/"` trên trang → exit 1 (rỗng) | PASS |
| `AC-04` | `git grep -nE "ACCEPTED|P1 Portals|P2 Commission|Chờ OP|v4.22|36 frame|11 hotspot"` trên trang → exit 1 | PASS |
| `AC-05` | `git grep -n "ve-hrp"` → chỉ 2 dòng, cả hai là `/ve-hrp.html` (dòng 14 card, dòng 80 CTA) | PASS |
| `AC-06` | Trang còn hero, card `/ve-hrp.html`, card `/jobs` (dòng 23), liên hệ `mailto:contact@hrpartner.vn` (dòng 152) | PASS (phần local) |
| `AC-07` | `npm run typecheck` exit 0; `npm run lint` exit 0 (492 warning, 0 error — baseline cũ); `npm run test:unit` exit 0, **91 file / 1408 test passed** | PASS |
| `AC-08` | `git status --short`: đúng 10 path trong scope §4.2 (8 tracked dirty + 2 layout mới). Ngoài scope chỉ có `public/index.html` (artifact do chạy lại `copy-static` khi audit) và WIP của luồng khác giữ nguyên | PASS |
| `AC-09` | `git grep "Tra cứu Bảng công" -- app` → exit 1 (rỗng). `app/layout.tsx:22` `template: '%s · HRPartner'`; `app/(jobs)/jobs/layout.tsx` `title: 'Việc làm'`; `app/(jobs)/track/layout.tsx` `title: 'Tra cứu hồ sơ ứng tuyển'`; `app/login/page.tsx` `title: 'Đăng nhập'`; `app/admin/layout.tsx` `title: 'Quản trị'`. Cả 2 layout mới là UTF-8 đúng, chỉ render `children`, không thêm markup | PASS |
| `AC-02`, `AC-10`, phần live `AC-06` | Chưa đo — thuộc Owner sau deploy theo `DEC-05` | OPEN, không chặn ACCEPTED |

Đính chính một chỗ sai trong `AUDIT.md`: mục AC-09 ghi title render là `Việc làm - HRPartner` (gạch nối). Template thật là `'%s · HRPartner'` (dấu chấm giữa), nên chuỗi đúng là `Việc làm · HRPartner`. Đây là lỗi ghi chép của Tier 3, không phải lỗi implementation — code khớp `AC-09`.

Hạn chế của audit round 1, ghi để không kể lại sai về sau: `AUDIT.md` **không** đánh giá 4 deviation và 3 limitation mà Tier 2 đã khai ở HANDOFF §6/§7, và bảng C-01..C-10 phần lớn ghi "DONE" theo lời văn thay vì command + exit + output. Tier 1 không coi đó là bằng chứng; các quyết định dưới đây dựa trên lần đo lại độc lập ở bảng trên chứ không dựa vào audit.

### Quyết định từng điểm Tier 2 khai

| ID | Nội dung | Quyết định Tier 1 | Lý do |
|---|---|---|---|
| `DEV-01` | Thêm 1 card mới trỏ `/jobs` | `ACCEPT_FIX` | `RQ-05`/`AC-06` bắt buộc phải có card `/jobs` mà bản gốc chưa có, nên thêm là cách duy nhất đạt AC. Câu chữ mô tả đúng chức năng đã triển khai (danh sách vị trí, nộp hồ sơ, tra cứu bằng mã) — không phải nội dung marketing mà `DEC-03` cấm. Giữ nguyên, không cần Tier 1 viết lại |
| `DEV-02` | Hoàn tác side-effect của chính mình trên `public/index.html` bằng `git checkout -- public/index.html` | `ACCEPT_FIX` | Đúng cách: đã chứng minh delta là bản copy của `cpSync` (`diff index.html public/index.html` exit 0) trước khi hoàn tác, chỉ chạm đúng file mình gây ra, không reset WIP của luồng khác. Lưu ý: file này **dirty lại** vì Tier 3 chạy lại script khi đo `AC-01` — xem điều kiện commit bên dưới |
| `DEV-03` | Không tự commit | `ACCEPT_FIX` | Đúng rule Git §9 của handoff (không commit khi TASK/Owner không yêu cầu rõ) và đúng giả định đo `AC-08` trên cây dirty. `DEC-06` chữ "commit path-scoped" là mô tả bước sau ACCEPTED, không phải lệnh cho Tier 2 tự commit. Không tính là vi phạm |
| `DEV-04` | Title `/ve-chung-toi` dài thêm hậu tố ` · HRPartner` | `DEFER` | Hệ quả cơ chế `template`, không phải edit của Tier 2. Chuỗi vẫn đúng nghĩa, chỉ dài. Dùng `title.absolute` là sửa `metadata` của trang — §4.2 cấm trong task này. Gom vào lượt dọn title/SEO sau, không chặn go-live |
| `LIM-01` | Title `/admin` không đo được HTML render ở local (route force-dynamic + redirect khi chưa đăng nhập) | `ACCEPT` | Bằng chứng thay thế đủ mạnh: source có `metadata.title = 'Quản trị'` và cơ chế template đã chứng minh thật trên 3 portal cùng dạng. Gộp xác nhận cuối vào admin smoke có đăng nhập của Owner, đi cùng `AC-10` |
| `LIM-02` | `npm run build` không chạy `copy-static`, đừng dùng làm bằng chứng `AC-01` | `ACCEPT` | Đúng: `package.json` không có hook `prebuild`, đường sinh `public/` là `buildCommand` trong `vercel.json`. Bằng chứng `AC-01` hợp lệ là chạy script trực tiếp, Tier 2 đã làm đúng |
| `LIM-03` | Không có test chặn hồi quy lỗ rò `public/docs` | `DEFER` | Đúng là task không yêu cầu. Ghi thành follow-up bên dưới; không mở scope trong task này |
| `OBS-01` | `public/mockup/F80_DemoExport.pdf` có nhúng chuỗi đường dẫn tài liệu nội bộ | `DEFER` | Không phải link bấm được trên site, thuộc vùng `DEC-04` (asset demo BoD giữ nguyên). Ghi nhận, không xử lý ở đây |
| `OBS-02` | `public/index.html` bản trong git đã cũ và còn mojibake so với `index.html` ở root | `DEFER` | Thật và đáng sửa: file tracked dù `.gitignore:56` liệt kê nó (ignore không áp cho file đã track) nên mỗi lần build là dirty, bản deploy khác bản trong git. Là task hạ tầng riêng: hoặc untrack, hoặc refresh |
| `OBS-03` | `tagStyle: 'wip'` thành nhánh không dùng | `REJECT` | Không dọn. Dead-code cosmetic, không AC nào cần, sửa thêm chỉ làm rộng diff |
| `OBS-04` | Card "Tra cứu bảng công" còn chữ "bảng lương A–E" và trỏ site cũ `hrpvietnam.vn` | `ACCEPT` (giữ nguyên) | Đúng theo product override 2026-08-28: payroll/payslip thuộc ứng dụng lương riêng, nên link ra ngoài là hợp lệ chứ không phải rác pipeline. Nếu Owner muốn đổi câu chữ thì là quyết định nội dung, mở lượt riêng |
| `OBS-05` | `/jobs` và `/track` vẫn không có navbar/footer chung | `ACCEPT` (giữ nguyên) | Đúng stop condition "layout mới phải trong suốt về UI". Thêm navbar cho 2 route đó là quyết định UX riêng, không thuộc task này |

### Điều kiện sau ACCEPTED

1. **Commit path-scoped — ĐÃ XONG, Tier 1 thực hiện sau khi đặt `ACCEPTED`.** Commit `b44e83c` trên `main`, đúng 10 path của §4.2 (`scripts/copy-static.mjs`, `app/(portal)/ve-chung-toi/page.tsx`, `app/layout.tsx`, `app/admin/layout.tsx`, `app/worker/layout.tsx`, `app/vendor/layout.tsx`, `app/ctv/layout.tsx`, `app/login/page.tsx`, `app/(jobs)/jobs/layout.tsx`, `app/(jobs)/track/layout.tsx`), staged theo path chứ không `git add -A`, và **`public/index.html` không nằm trong commit** — nó là artifact ngoài scope (`DEV-02`, `OBS-02`) nên vẫn dirty; muốn cây sạch thì `git checkout -- public/index.html`. Artifact pipeline (`TASK.md`/`HANDOFF.md`/`AUDIT.md`/`PLANNER_HANDOVER.md`) đi trong commit tài liệu riêng ngay sau đó. **Chưa push** — push `main` là hành động kích hoạt deploy production nên thuộc Owner.
2. **Push + deploy production (Owner)** rồi đo `AC-02` (4 URL `/docs/**` phải trả 404) và `AC-10` (`/` và `/jobs` không còn title `Tra cứu Bảng công HRP`), cùng phần live của `AC-06` (`/ve-chung-toi` còn 200). Nếu `AC-02` vẫn 200 sau deploy thì nguyên nhân khả dĩ là build cache của Vercel còn `public/docs` cũ — khi đó mở execution round mới, không sửa lặng lẽ.
3. **Chỉ công bố link sau khi `AC-02` và `AC-10` đo xanh.** ACCEPTED ở đây là đóng contract code, không phải xác nhận production đã sạch.

### Follow-up đã ghi nhận, chưa mở task

- Test hồi quy chặn `copy-static` ghi vào `public/docs` (`LIM-03`).
- Xử lý `public/index.html`: untrack hoặc refresh cho khớp root, kèm sửa mojibake (`OBS-02`).
- Lượt dọn title/SEO: `title.absolute` cho `/ve-chung-toi` và rà độ dài title toàn site (`DEV-04`).

Task `ACCEPTED`. Source đổi thêm sau mốc này phải audit lại theo PLANNER_HANDOVER §6.


## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 2026-08-29 | Tạo contract từ evidence `EV-01..EV-10`; status `READY_FOR_EXECUTION` |
| v1.1 | 2026-08-29 | Owner báo title tab vẫn sai trên production. Đo lại (`EV-09`, `EV-11..EV-14`): bản sửa metadata có trong working tree nhưng chưa commit nên chưa deploy, và chỉ 6 file trong `app/**` khai báo metadata nên mọi trang thừa hưởng title gốc. Bỏ non-goal "không đổi metadata title", thêm `RQ-07`/`STEP-07`/`AC-09`/`AC-10`, `DEC-06..DEC-08`, mở scope sang 5 file layout dirty + 2 layout mới cho `/jobs` và `/track` + `app/login/page.tsx`. Không đổi RQ-01..RQ-06 |
| v1.1 | 2026-08-29 | Audit round 1 `PASS`; Tier 1 đo lại độc lập 8 AC local rồi ghi resolution §9 và đặt `ACCEPTED`. Spec không đổi (chỉ resolution), `AC-02`/`AC-10` còn OPEN thuộc Owner sau deploy |
