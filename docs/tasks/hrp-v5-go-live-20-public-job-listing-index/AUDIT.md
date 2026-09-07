# AUDIT: hrp-v5-go-live-20-public-job-listing-index

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-20-public-job-listing-index` |
| Work/Audit type | `CODE / CODE_AUDIT` |
| Spec version | `v1.5` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | `HANDOFF round 1 — READY_FOR_AUDIT` |
| Round closes when | `verdict PASS + Planner Resolution ACCEPTED` |
| Auditor/context | `Tier 3 độc lập; đo trong worktree gl20 (nhánh worktree-gl20), delivery còn ở INDEX (chưa commit), HEAD b68d25b có trước bản giao nên mọi phép đọc dùng git show :<path>` |
| Baseline/diff/artifacts | `b68d25b; đo trên blob staged (git show :<path>), lane chạy trên worktree đã stage sạch` |
| Independence | `Confirmed — lệnh do Tier 3 tự chạy lại; fingerprint 5 tệp gate PRE==POST (không trôi giữa vòng)` |
| Audit time | `2026-09-06 09:12 +07` |

## 1. Findings

Sắp xếp P0 → P3. Không có finding P0/P1/P2 mở.

### AUD-001 — Parity nhãn lương của AC-14 neo trên trang chủ WORKTREE, không phải blob baseline

- **Severity:** `P3`
- **Status:** `ACCEPTED_RISK`
- **RQ/AC:** `AC-14`
- **Evidence:** `evidence/ac14-label-parity.txt`; `git show :src/domains/job-board/public-listing.labels.ts` — cả listing lẫn `app/(portal)/page.tsx` cùng dùng `'Lương thương lượng'`. Hiện trang chủ worktree == baseline b68d25b nên parity đúng ở thời điểm đo.
- **Impact:** nếu ui-01 (chưa ACCEPTED) đổi nhãn lương trang chủ trước khi task này commit, phép đo parity có thể dịch. Không ảnh hưởng tính đúng hiện tại.
- **Decision needed from Planner:** dời việc tái-neo parity sang R-06 / Q-02 sau khi ui-01 ACCEPTED. Không vá gì trong vòng này.

### AUD-002 — Trường điều khiển Tier 1 của TASK do người thực thi tự bơm dưới uỷ quyền

- **Severity:** `P3`
- **Status:** `ACCEPTED_RISK`
- **RQ/AC:** `LIM-15 (HANDOFF)`
- **Evidence:** HANDOFF khai Tier 1 chính đang viết kế hoạch V6 nên uỷ quyền tác giả contract; `verify-task.ps1` trên TASK v1.5 = RESULT: PASS exit 0 (`evidence/audit-r1-verify-task.txt`).
- **Impact:** tách tầng bị co ở khâu viết contract. Bản audit độc lập này (Tier 3) là chốt kiểm soát bù; tôi đã tự kiểm cả tính ĐO ĐƯỢC lẫn tính CÓ NGHĨA của 21 AC (không AC nào đúng-mặt-chữ-mà-vô-giá-trị).
- **Decision needed from Planner:** ghi nhận nguồn tác giả contract; không mở lại vòng.

## 2. Acceptance Verification

Mọi AC của TASK có dòng. Method = lệnh Tier 3 TỰ chạy lại trong worktree gl20 (đọc blob staged bằng `git show :<path>`).

| AC | Independent method | Result | Evidence | Finding |
|---|---|---|---|---|
| `AC-01` | `git show :app/(jobs)/viec-lam/page.tsx` rồi `grep -c "'use client'"` => `0` (Server Component thuần) | PASS | `evidence/ac01-server-only.txt` | None |
| `AC-02` | `npm run build` => route `ƒ /viec-lam` (Dynamic); `git show :page` grep `force-dynamic`=1, `runtime='nodejs'`=1 | PASS | `evidence/ac02-render-flags.txt` | None |
| `AC-03` | `npm run test:unit -- public-listing.params.test.ts` => `23` pass exit `0`; cửa RED (module vắng) exit `1` trước khi tạo | PASS | `evidence/ac03-params-green.txt` | None |
| `AC-04` | `git show :src/domains/job-board/public-listing.params.ts` grep `buildListingHref` chỉ set `4` khoá q/area/shift/offset; params.test `23` pass | PASS | `evidence/ac04-param-allowlist.txt` | None |
| `AC-05` | `git show :page` grep `facets.areas.map`=1 `facets.shifts.map`=1, `0` mảng hằng nhúng | PASS | `evidence/ac05-facets-source.txt` | None |
| `AC-06` | `npm run test:unit -- public-listing.params.test.ts` => `23` pass exit `0` (first-no-prev, last-no-next giữ nguyên filter) | PASS | `evidence/ac06-pagination.txt` | None |
| `AC-07` | `git show :public-listing.params.ts` grep -c `if (offset > 0)` => `1` (offset=0 bị bỏ khỏi URL canonical) | PASS | `evidence/ac07-canonical-url.txt` | None |
| `AC-08` | `git show :page` grep -bo: `evaluateRateLimits(`=5677 < guard `outcome.kind`=5926 < `withPublicDb(`=6355 (fail-closed) | PASS | `evidence/ac08-ratelimit-order.txt` | None |
| `AC-09` | `git show :page` — `ThrottledNotice` nội suy `0` giá trị request, chỉ `2` hằng RATE_LIMITED + LISTING_PATH | PASS | `evidence/ac09-throttled-no-leak.txt` | None |
| `AC-10` | `git show :page` grep -c: `withPublicDb(`=1, `listPublicJobProjection(`=1, `getPrisma()`=1, `/api/jobs`=0 (1 đường DB duy nhất) | PASS | `evidence/ac10-db-path.txt` | None |
| `AC-11` | `npm run build` metadata biên dịch exit `0`; `git show :page` canonical=1 robots(listingIsIndexable)=1 | PASS | `evidence/ac11-metadata.txt` | None |
| `AC-12` | `git show :page` grep -c `overview` => `0` (dùng `total` thật, không phải chỉ số overview) | PASS | `evidence/ac12-total-not-overview.txt` | None |
| `AC-13` | `git show :page` grep `resetHref` trỏ `LISTING_PATH`=1 (empty-state hiểu filter); listing-static `29` pass | PASS | `evidence/ac13-empty-state.txt` | None |
| `AC-14` | `git show :public-listing.labels.ts` + `app/(portal)/page.tsx` cùng chuỗi `Lương thương lượng` (parity `2` nguồn); listing-static `29` | PASS | `evidence/ac14-label-parity.txt` | AUD-001 |
| `AC-15` | `git show :page` grep `publicJobDetailPath`=1, `formatDeadlineDate`=1 (tái dùng helper), `0` reformat ngày cục bộ; `tsc` exit `0` | PASS | `evidence/ac15-helper-reuse.txt` | None |
| `AC-16` | `git show :app/components/GlobalNavbar.tsx` grep -c `href` => `5` liên kết; `public-ui-premium.static.test.ts` `63` pass exit `0` | PASS | `evidence/ac16-navbar.txt` | None |
| `AC-17` | `git show :app/(jobs)/viec-lam/[slug]/page.tsx` grep `href="/"`=0, `href="/viec-lam"`=2; barrier RED exit `1` → GREEN `23` exit `0` | PASS | `evidence/ac17-back-links.txt` | None |
| `AC-18` | `npm run test:unit -- public-listing.static.test.ts` => id `listing-*` `toHaveLength(3)`, htmlFor ghép cặp, min-h-`11`; `29` pass exit `0` | PASS | `evidence/ac18-a11y.txt` | None |
| `AC-19` | `npm run test:unit`=1694 exit `0`; `tsc` exit `0`; `eslint` `483` warn / `0` err exit `0`; `npm run build` exit `0` (không lane nào giảm số) | PASS | `evidence/ac19-lane-unit.txt` | None |
| `AC-20` | `git diff --cached --name-only` => `63` path ⊆ allowlist §4.1 + docs/slug; tiền tố ui-01 forbidden = `0/0/0` | PASS | `evidence/ac20-scope.txt` | None |
| `AC-21` | `git diff --cached -U0 -- ...public-surface-limiter.static.test.ts` => `1` hunk `@@ -120,2 +120,21 @@`; census RED (len3 got4) exit `1` → GREEN `9` exit `0` | PASS | `evidence/ac21-single-hunk.txt` | None |

### Checklist kiểm định (C-01..C-10)

| Check | Status | Evidence (command + exit + output) |
|---|---|---|
| `C-01` Regression toàn cục | DONE | `npm run test:unit` exit `0` — `109` files / `1694` tests pass (Duration 27.19s) — `evidence/audit-r1-lanes.txt` |
| `C-02` Build | DONE | `npm run build` exit `0` — `ƒ /viec-lam` 168 B, `ƒ /viec-lam/[slug]` 910 B — `evidence/ac02-render-flags.txt` |
| `C-03` Đọc route/code từng dòng | DONE | `git show :app/(jobs)/viec-lam/page.tsx` — `419` dòng Server Component, `0` 'use client', loadListing fail-closed — `evidence/ac01-server-only.txt` |
| `C-04` Prisma query vs schema | DONE | `git diff --cached --name-only` grep -cE `^prisma/` => `0` (schema bất biến); `git show :page` grep -c `listPublicJobProjection(` => `1` (tái dùng helper `public.service`). `npx prisma validate` exit `1` do getConfig/env — KHÔNG dùng làm bằng chứng — `evidence/ac10-db-path.txt` |
| `C-05` POST/PATCH idempotency + outbox | DONE | mỗi tệp code staged `git show :<p>` grep -cE `export async function (POST` và `PATCH)` => `0` mutation mới (chỉ GET + form method=get) — `evidence/audit-r1-checks.txt` |
| `C-06` Migration / RLS | DONE | `git diff --cached --name-only` grep -cE tiền tố `^prisma/migrations` cộng `^prisma/schema` => `0` (không migration, đường đọc qua `withPublicDb` RLS-safe) — `evidence/audit-r1-checks.txt` |
| `C-07` Git hygiene / vùng cấm | DONE | `git diff --cached --name-only` => `63` path ⊆ §4.1 + docs/slug; tiền tố ui-01 = `0/0/0` — `evidence/ac20-scope.txt` |
| `C-08` Phủ test cho phần đổi | DONE | `npm run test:unit -- <5 tệp barrier>` => `147` pass exit `0` (params23 / listing29 / detail23 / limiter9 / premium63) — `evidence/audit-r1-lanes.txt` |
| `C-09` verify-task.ps1 trên TASK | DONE | `.ai-pipeline/scripts/verify-task.ps1` RESULT: PASS exit `0` (`17` req traceable, `21` AC measurable, `23` file:line resolve) — `evidence/audit-r1-verify-task.txt` |
| `C-10` Diff scope baseline..HEAD | DONE | baseline b68d25b == HEAD (delivery ở INDEX); `git diff --cached --numstat` => `1127` dòng thêm trên `9` tệp code — `evidence/audit-r1-measurements.txt` |
## 3. Scope và Impact

- **Deliverable đo được (INDEX của gl20, chưa commit):** `9` tệp code + `54` tệp docs = `63` path. Code gồm trang `app/(jobs)/viec-lam/page.tsx` (mới, 419 dòng), `app/(jobs)/viec-lam/[slug]/page.tsx` (sửa back-link), `app/components/GlobalNavbar.tsx` (sửa), 2 helper `public-listing.params.ts` + `public-listing.labels.ts` (mới), và 4 tệp test barrier.
- **Out-of-scope:** không tệp `prisma/` nào bị chạm (`0` migration, `0` sửa schema); không API mới; đường dữ liệu tái dùng `listPublicJobProjection` sẵn có.
- **Blast radius:** 2 barrier test (`public-detail.static.test.ts`, `public-surface-limiter.static.test.ts`) SIẾT lại (RED→GREEN với assertion chặt hơn, không nới), census `toHaveLength` từ 3→4 khớp nav thật; toàn bộ `1694` test toàn cục vẫn xanh.
- **Data / security:** đường đọc công khai đi qua `withPublicDb(getPrisma(), …)` (GUC RLS đặt đúng), rate-limit `evaluateRateLimits` chạy TRƯỚC truy vấn DB và fail-closed (offset 5677 < 5926 < 6355). Không có secret/PII trong bản giao.
- **S-16 lưu ý:** `9` tệp code staged nằm ngoài `docs/tasks/<slug>/` là bản giao của Tier 2 (Tier 1 sẽ commit), KHÔNG phải Tier 3 thêm nguồn. Audit này chỉ ghi `docs/tasks/<slug>/AUDIT.md` + `evidence/*`.

## 4. Independent Evidence

Mỗi hàng là một lệnh Tier 3 TỰ chạy lại trong gl20 (đo THIS turn). Không hàng nào chép số từ HANDOFF.

| Check / command | Exit / result | Summary | Evidence path / limitation |
|---|---|---|---|
| `npm run test:unit` | exit `0` | `109` files / `1694` tests pass, Duration 27.19s | `evidence/audit-r1-lanes.txt` |
| `npm run test:unit -- <5 tệp barrier>` | exit `0` | `147` tests pass (63+23+29+23+9), Duration 1.17s | `evidence/audit-r1-lanes.txt` |
| `npm run typecheck` (`tsc --noEmit`) | exit `0` | `0` type error trên bản staged | `evidence/ac19-typecheck.txt` |
| `npm run lint` (`eslint`) | exit `0` | `483` problems = `0` error / `483` warning | `evidence/ac19-lint.txt` |
| `npm run build` (`next build`) | exit `0` | `ƒ /viec-lam` 168 B, `ƒ /viec-lam/[slug]` 910 B (Dynamic) | `evidence/ac02-render-flags.txt` |
| `git show :page` rồi `grep -bo` | 5677 `<` 5926 `<` 6355 | AC-08 thứ tự fail-closed rate-limit trước guard trước DB | `evidence/audit-r1-measurements.txt` |
| `git show :page` grep -c `listPublicJobProjection(` | `1` | AC-10 một call DB (import :48 + type :78 không tính) | `evidence/audit-r1-measurements.txt` |
| `git diff --cached --name-only` đếm | `63` | AC-20 scope staged; tiền tố ui-01 forbidden = `0/0/0` | `evidence/ac20-scope.txt` |
| `git diff --cached -U0` limiter test grep -c `^@@` | `1` | AC-21 một hunk `@@ -120,2 +120,21 @@` | `evidence/ac21-single-hunk.txt` |
| `git diff --cached --numstat` (9 tệp code) | `1127` thêm | tổng dòng bản giao | `evidence/audit-r1-measurements.txt` |
| `.ai-pipeline/scripts/verify-task.ps1` | RESULT: PASS exit `0` | C-09 cổng contract, `21` AC measurable | `evidence/audit-r1-verify-task.txt` |
| `git hash-object` × `5` tệp gate | PRE == POST | không trôi giữa vòng: gate-lib 6daa689…, verify-audit e1edaeb…, verify-task e36b83d… | `evidence/audit-r1-measurements.txt` |
| `npm run test:unit -- public-listing.params.test.ts` (cửa RED) | exit `1` → `0` | module vắng RED trước tạo, rồi `23` pass GREEN | `evidence/ac03-params-red.txt` |
| `npm run test:unit -- public-surface-limiter.static.test.ts` (census RED) | exit `1` → `0` | assertion cũ len3 got4 RED, rồi `9` pass GREEN | `evidence/ac21-census-red.txt` |
## 5. Coverage Gaps

Hai điểm P3 dưới đây KHÔNG hạ verdict (mọi AC-01..AC-21 đều PASS đo độc lập); ghi để Planner xử lý ngoài vòng:

- **Parity nhãn lương (AUD-001 / LIM-06):** phép so `Lương thương lượng` neo trên trang chủ worktree hiện == baseline b68d25b. Nếu ui-01 đổi nhãn trước khi task này commit, cần tái-neo ở R-06 / Q-02. Đo hôm nay: khớp `2` nguồn.
- **Nguồn tác giả contract (AUD-002 / LIM-15):** trường điều khiển Tier 1 do người thực thi bơm dưới uỷ quyền; audit độc lập này là chốt bù. Đã tự kiểm tính CÓ NGHĨA của cả `21` AC.
- **Cửa RED của AC-03 ở mức import (module vắng), không ở mức assertion:** đây là RED test-first hợp lệ (`Failed to load url … Does the file exist?`, exit `1`) rồi GREEN `23`. Không phải khiếm khuyết.

Không có khoảng trống phủ test nào chặn go-live.

## 6. Verdict và Planner Questions

**Verdict:** PASS

- **Căn cứ:** `21/21` AC đo độc lập trong gl20 đều PASS; `0` finding P0/P1/P2 mở; `C-01..C-10` đều DONE (không SKIP); bốn lane toàn cục xanh (`1694` test, `tsc`, `eslint` `0` error, `build`); hai barrier SIẾT chứ không nới; fingerprint gate PRE==POST. Chỉ còn `2` quan sát P3 loại ACCEPTED_RISK.
- **Q-01 (AUD-001):** chấp thuận dời tái-neo parity nhãn lương sang R-06 / Q-02 sau khi ui-01 ACCEPTED?
- **Q-02 (AUD-002):** ghi nhận nguồn tác giả contract dưới uỷ quyền Tier 1; không mở lại vòng?
- **Khuyến nghị đóng vòng:** Planner Resolution = ACCEPTED, rồi Tier 1 commit bản giao gl20 bằng `git commit -- <pathspec>` (Tier 3 KHÔNG commit/push).

## 7. Re-audit Trace

| Audit round | Ngày | Verdict | Ghi chú |
|---|---|---|---|
| `1` | 2026-09-06 | PASS | Vòng đầu; đo trên INDEX của gl20 (`git show :<path>`); `2` finding P3 ACCEPTED_RISK; không có vòng trước để so §4 |

**Gate tự kiểm:** `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath … -HandoffPath … -RepoRoot <gl20>` => `RESULT: PASS WITH WARNINGS` exit `0`; đúng `1` warning S-16 (`9` tệp code Tier 2 staged ngoài docs/slug — đã ghi ở §3, không phải Tier 3 thêm nguồn). Fingerprint 5 tệp gate POST == PRE.

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
