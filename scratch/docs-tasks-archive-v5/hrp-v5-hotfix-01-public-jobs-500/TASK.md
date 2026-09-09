# TASK: hrp-v5-hotfix-01-public-jobs-500

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-hotfix-01-public-jobs-500` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | `Tier 1` |
| Executor | `Tier 2` |
| Auditor | `Tier 3 independent context` |
| Baseline | `d4928af` |
| Modules | `M13 Marketplace public read` |
| ADR references | `go-live-04 DEC-01/DEC-02/DEC-08 (with-public-db), m1_07b section 2.2` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | `DONE` |
| Updated | `2026-08-31 12:40 +07` |

## 1. Outcome

### User-visible outcome

Trang `/` hiện lại danh sách việc làm thay vì hộp lỗi `Lỗi 500`. `GET /api/jobs` và `GET /api/jobs/{slug}` trả 200 với JSON projection dưới principal công khai `MKT`, kể cả khi bảng `client_companies` bị RLS che hoàn toàn — đó là trạng thái thật của production, không phải trạng thái lỗi.

Đây là hotfix P0 khôi phục dịch vụ. Nó KHÔNG khôi phục độ chính xác của facet "ngành": sau hotfix, `industry` được suy ra bằng heuristic văn bản. Việc đưa ngành thật lên bề mặt công khai là quyết định dữ liệu, thuộc task khác (mục 8, `Q-01`).

### Non-goals

- Không cấp thêm quyền RLS cho principal `MKT` trên bất kỳ bảng nào.
- Không viết migration. Task này có ZERO câu lệnh SQL.
- Không denormalize `industry` xuống `outsourcing_projects`.
- Không đổi hợp đồng JSON của `/api/jobs` (giữ nguyên tên và kiểu mọi field của `PublicJobDto`).
- Không sửa UI, không đổi `app/(portal)/page.tsx`.
- Không revert `d4928af`. Nếu Owner chọn revert thì task này bị `CANCELLED`, không thực thi song song.
- Không tự push. Deploy production là hành động của Owner (`UNIFIED_PLAN` 9.1).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | Live probe 31/08 sau khi push `c32acf9..d4928af` | `https://www.hrpartner.vn/` = 200 nhưng render hộp lỗi; `/api/jobs` = 500 body RỖNG; `/api/jobs/DA-DEMO-001` = `/api/jobs/DA-DEMO-002` = 500. Header `Server: Vercel`, `X-Matched-Path: /api/jobs`, `X-Request-Id: 63715edf-26f7-4034-99a6-8109088fa9ca` | Regression P0 trên bề mặt công khai; body rỗng là dấu hiệu exception chưa bắt trong route handler, không phải envelope lỗi của app |
| `EV-02` | `git diff c32acf9 d4928af -- src/domains/job-board/public.service.ts` | Bốn dòng thêm mới: field `industry: string` trong DTO, `clientCompany: { industry: string \| null }` trong tham số `toDto`, `industry: inferIndustry(searchableText, project.clientCompany.industry)`, và `clientCompany: { select: { industry: true } }` trong `publicSelect` | Join `client_companies` và deref không guard đều SINH RA ở `d4928af`; không có nguyên nhân nào khác chạm DB trong diff |
| `EV-03` | `git show c32acf9:src/domains/job-board/public.service.ts` | Bản đang chạy trước deploy không chứa một dòng `clientCompany` hay `industry` nào | Loại trừ giả thuyết "lỗi có sẵn từ trước rồi mới lộ" |
| `EV-04` | `src/shared/auth/with-public-db.ts:48-52` | `PUBLIC_READ_PRINCIPAL = { userId: 'system:public-job-board-read', role: 'MKT', purpose: 'PUBLIC_JOB_BOARD_READ' }`; comment SECURITY ghi rõ "role: 'MKT' và CHỈ 'MKT'" | Mọi truy vấn của `/api/jobs` chạy dưới đúng role `MKT`; không có đường nâng quyền hợp lệ |
| `EV-05` | `prisma/migrations/20260827160000_m1_07b_rls_runtime_posture_closure/migration.sql:56` | `ALTER TABLE client_companies ENABLE ROW LEVEL SECURITY; ALTER TABLE client_companies FORCE ROW LEVEL SECURITY;` | Bảng ở posture FORCE, owner cũng không bypass |
| `EV-06` | cùng file `:133-135` | `CREATE POLICY hrp_client_company_select ON client_companies AS PERMISSIVE FOR SELECT TO app_user_writer, app_user USING (hrp_session_role() IN ('ADMIN','HR_MANAGER','DIRECTOR','ACCOUNTANT','SALE','HR_STAFF','PM'))` | `MKT` KHÔNG thuộc tập role được đọc, nên SELECT trả 0 dòng |
| `EV-07` | `grep -rn "MKT" prisma/migrations/*/migration.sql` — 5 file khớp: `g22_security` (enum), `s1_rls_project`, `s1_rls_vendor` (ghi chú deny), `p2_commission_rls` (ghi chú deny), `m13_restore_rls_matrix` (`hrp_project_visible_for`) | Không migration nào cấp cho `MKT` quyền đọc `client_companies` | Đóng giả thuyết "policy tồn tại ở migration khác"; kết luận 0 dòng là chắc chắn, không cần nối DB production |
| `EV-08` | `prisma/schema.prisma` model `Project` dòng 4 và 21 | `clientCompanyId String @map("client_company_id")` và `clientCompany ClientCompany @relation(...)` — quan hệ BẮT BUỘC ở mức kiểu | Prisma cho phép field này `null` lúc runtime khi RLS che dòng liên quan, nhưng TypeScript coi nó non-null ⇒ `tsc` không thể bắt lỗi này. Đây là lý do typecheck xanh mà production sập |
| `EV-09` | `prisma/migrations/20260830214139_m14_rls_matrix_repair/migration.sql` | 15 `CREATE POLICY`; `client_companies` KHÔNG có trong danh sách | Task 06 không và sẽ không làm bảng này đọc được cho `MKT` ⇒ chờ 06 không phải cách sửa |
| `EV-10` | `src/domains/job-board/mp1.contract.test.ts:74` | Fixture duy nhất là `clientCompany: { industry: null }` — object quan hệ LUÔN có mặt; không test nào đặt `clientCompany: null` | Blind spot đo được của lane test: 1416 test xanh vẫn để lọt P0. `AC-03` biến chính lỗ này thành phép đo |
| `EV-11` | `app/api/jobs/route.ts:16-39` | Handler `GET` không có `try/catch`; `withPublicDb` cũng cố ý không try/catch (comment dòng 25-26 của `with-public-db.ts`) | Exception nổi thẳng lên Next.js ⇒ 500 body rỗng. Task này KHÔNG thêm try/catch (mục 4.2) vì bọc lỗi lại tái lập chế độ hỏng-thành-im-lặng mà go-live-04 vừa xoá |
| `EV-12` | `app/(portal)/page.tsx:548-558` và `:793-795` | Trang fetch `/api/jobs`, `if (!res.ok) throw new Error('Lỗi ' + res.status)`, và render hộp `--color-error-container` | Xác nhận thiệt hại nhìn thấy được: khách thấy hộp lỗi, không phải danh sách trống |
| `EV-13` | `src/domains/job-board/public.service.ts:207-210` | `getPublicJobProjection` dùng CÙNG `publicSelect` và CÙNG `toDto` | Sửa ở `toDto` là sửa cả hai endpoint; đừng patch riêng từng route |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | `CHOSEN` | Sửa bằng optional-chaining tại đúng chỗ deref trong `toDto`, KHÔNG bỏ join khỏi `publicSelect`. Lý do: bỏ join là thay đổi hình dạng truy vấn, cần đo lại toàn bộ lane; giữ join cho phép cùng một mã nguồn trả ngành thật khi `Q-01` được quyết mà không phải sửa lần nữa. Chi phí của join vô dụng là một truy vấn phụ trên bảng bị che — chấp nhận được cho hotfix | Tier 1, `EV-02`/`EV-13` | CHOSEN 2026-08-31 |
| `DEC-02` | `CHOSEN` | KHÔNG cấp `MKT` quyền SELECT trên `client_companies`. RLS là mức DÒNG chứ không mức CỘT: mở dòng cho `MKT` là mở luôn `name`, `tax_code`, `company_size` của khách hàng cho đường đọc vô danh, dù projection chỉ chọn `industry`. Ngoài ra đó là migration thứ tư, vượt stop condition Owner đặt 31/08 | Tier 1, `EV-06` + lệnh Owner 31/08 | CHOSEN 2026-08-31 |
| `DEC-03` | `CHOSEN` | Giá trị thay thế khi quan hệ bị che là `null` truyền vào `inferIndustry`, KHÔNG phải chuỗi rỗng và KHÔNG phải chuỗi hằng kiểu "Khác". `inferIndustry` đã nhận `string \| null` ở tham số thứ hai (`EV-02`) nên `null` là đường đã có, không phải nhánh mới | Tier 1 | CHOSEN 2026-08-31 |
| `DEC-04` | `CHOSEN` | Không thêm `try/catch` vào route hay `withPublicDb`. Sửa nguyên nhân, không che triệu chứng. `with-public-db.ts:25-26` ghi rõ chế độ hỏng-thành-rỗng-im-lặng là lý do defect go-live-04 sống sót qua mọi gate | Tier 1, `EV-11` | CHOSEN 2026-08-31 |
| `DEC-05` | `ASSUMPTION` | Không có nguyên nhân thứ hai cho 500. Cơ sở: diff `d4928af` chỉ có đúng một thay đổi chạm DB trên đường đọc công khai (`EV-02`), và tra cứu mã ứng tuyển — đường DB mới còn lại của cùng commit — trả 404 sạch. Chưa đọc được log Vercel (không có CLI trên PATH). `STEP-05` biến giả định này thành phép đo: nếu sau fix mà `/api/jobs` còn 500 thì giả định SAI và Tier 2 phải dừng, ghi vào HANDOFF, không sửa mò tiếp | Tier 1 | ASSUMPTION, hết hiệu lực khi `AC-05` chạy |
| `DEC-06` | `CHOSEN` | Fix phải chạy được trên CẢ hai trạng thái dữ liệu: quan hệ bị che (production hôm nay) và quan hệ đọc được (mọi role nội bộ, và test DB nơi role admin bypass). Vì vậy `AC-03` đòi hai case test, không phải một | Tier 1, `EV-10` | CHOSEN 2026-08-31 |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `toDto` trong `src/domains/job-board/public.service.ts` không được deref `.industry` trên một quan hệ có thể `null` lúc runtime. Sau sửa, `industry` vẫn là `string` non-null trong `PublicJobDto` (hợp đồng JSON không đổi) và được tính bằng `inferIndustry(searchableText, null)` khi quan hệ bị che. |
| `RQ-02` | Kiểu tham số của `toDto` phải nói thật về runtime: `clientCompany` là `{ industry: string \| null } \| null`. Kiểu nói dối chính là thứ làm `tsc --noEmit` xanh trong khi production sập (`EV-08`), nên chỉ sửa biểu thức mà giữ kiểu non-null là KHÔNG đạt `RQ-02`. |
| `RQ-03` | Lane unit phải có test RED-trước-GREEN cho đúng trạng thái production: một case `clientCompany: null` và một case `clientCompany: { industry: 'Điện tử' }`. Case đầu, chạy trên mã nguồn ở baseline `d4928af`, phải FAIL; chạy trên mã đã sửa phải PASS. |
| `RQ-04` | Không thêm, xoá hay đổi bất kỳ field nào của `PublicJobDto`, và không đổi thứ tự/tên field trong `publicSelect`. |
| `RQ-05` | Toàn bộ thay đổi nằm trong hai file: `src/domains/job-board/public.service.ts` và một file test thuộc lane unit. Không sửa route, không sửa UI, không sửa migration, không sửa `with-public-db.ts`. |
| `RQ-06` | Gate tĩnh phải sạch với exit code THẬT, đo không qua pipe: `npm run typecheck` = 0 và `npm run test:unit` = 0 với số test không giảm so với 1416. |

### 4.2 Scope boundaries

| Được phép sửa | Cấm chạm |
|---|---|
| `src/domains/job-board/public.service.ts` — chỉ `toDto` (kiểu tham số + biểu thức `industry`) | `publicSelect`, `listPublicJobProjection`, `getPublicJobProjection`, `inferIndustry`, `classifyShift`, `classifyJobType` |
| Một file test trong lane unit dưới `src/domains/job-board/` | `app/api/jobs/route.ts`, `app/api/jobs/[slug]/route.ts` |
| — | `src/shared/auth/with-public-db.ts` và `rls-context.ts` |
| — | `prisma/schema.prisma`, mọi thứ dưới `prisma/migrations/`, `prisma/seed.mjs` |
| — | `app/(portal)/page.tsx` và mọi file UI |
| — | `vitest.unit.config.ts`, `vitest.config.ts` |
| — | Mọi file đang dirty của luồng khác: `public/index.html`, `docs/tasks/hrp-v5-go-live-02-*/AUDIT.md`, `docs/tasks/hrp-v5-go-live-04-*/AUDIT.md`, `.neon`, `rls-probe-*.txt`, `scratch/*`, `scripts/debug-parser.mjs`, `docs/aff_plan*.md` |

### 4.3 Data, State, Permission và Interface Rules

- **Permission:** principal của đường đọc công khai vẫn là `MKT` và chỉ `MKT`. Task này không đổi một bit nào về quyền, ở cả tầng app và tầng DB.
- **Data:** `client_companies` vẫn bị che hoàn toàn với `MKT`. Sau fix, `industry` trên bề mặt công khai là giá trị SUY RA từ văn bản dự án, không phải ngành khai báo của khách hàng. Không được ghi bất cứ đâu trong code hay UI rằng đó là ngành do khách hàng khai.
- **State:** không có migration, không có seed, không có ghi DB. Transaction công khai vẫn READ-ONLY.
- **Interface:** `GET /api/jobs` giữ nguyên `{ jobs, nextOffset, total }`; `GET /api/jobs/{slug}` giữ nguyên `PublicJobDto` hoặc 404.
- **Bí mật:** không in connection string, token, password, PII thật vào log hay HANDOFF.

## 5. Execution Plan

| ID | Step |
|---|---|
| `STEP-01` | Đọc `src/domains/job-board/public.service.ts` từ dòng 1 đến `publicSelect`, xác định đúng vị trí kiểu tham số `toDto` và biểu thức `industry`. Ghi lại số dòng thật vào HANDOFF. |
| `STEP-02` | Viết test RED trước: thêm case `clientCompany: null` vào lane unit dưới `src/domains/job-board/`. Chạy `npm run test:unit` TRƯỚC khi sửa service; ghi output FAIL kèm exit code thật vào HANDOFF. Không có bằng chứng RED thì `AC-03` không đạt. |
| `STEP-03` | Sửa kiểu tham số `toDto` cho `clientCompany` thành nullable (`RQ-02`), rồi sửa biểu thức thành optional-chaining với fallback `null` (`RQ-01`, `DEC-03`). |
| `STEP-04` | Thêm case `clientCompany: { industry: 'Điện tử' }` để chứng minh nhánh đọc được vẫn đúng (`DEC-06`), rồi chạy lại `npm run test:unit`: cả hai case PASS. |
| `STEP-05` | Chạy `npm run typecheck` và `npm run test:unit` KHÔNG qua pipe, ghi `$LASTEXITCODE` ngay sau mỗi lệnh. Nếu số test tổng nhỏ hơn 1416 thì dừng và báo, đó là dấu hiệu file test bị loại khỏi lane. |
| `STEP-06` | Chạy `git status --short` và `git diff --stat`, dán vào HANDOFF. Diff phải đúng 2 file. Nếu có file thứ ba thì dừng, không tự dọn. |
| `STEP-07` | Viết HANDOFF.md với evidence THẬT cho từng AC: lệnh, exit code, output. Không commit, không push, không deploy. Ghi rõ ở đầu HANDOFF rằng deploy là hành động của Owner. |

## 6. Acceptance

| ID | Acceptance criterion | Cách đo |
|---|---|---|
| `AC-01` | Không còn deref không guard: trong `src/domains/job-board/public.service.ts` không tồn tại chuỗi `project.clientCompany.industry` | `grep -n "project.clientCompany.industry" src/domains/job-board/public.service.ts` trả 0 dòng |
| `AC-02` | Kiểu đã nói thật: tham số `clientCompany` của `toDto` khai báo nullable | Đọc chữ ký `toDto`; phần khai báo `clientCompany` chứa cả `industry: string \| null` và một `\| null` ở mức object |
| `AC-03` | Có bằng chứng RED-trước-GREEN cho case `clientCompany: null`, và case `clientCompany` có giá trị vẫn PASS | HANDOFF chứa hai lần chạy `npm run test:unit`: lần trước `STEP-03` có FAIL đúng tên test mới kèm exit code khác 0; lần sau `STEP-04` PASS kèm exit code 0. Tier 3 chạy lại được bằng `git stash` phần sửa service |
| `AC-04` | Gate tĩnh sạch, exit code thật: `npm run typecheck` = 0; `npm run test:unit` = 0 với tổng test lớn hơn hoặc bằng 1416 | Chạy lại từng lệnh không pipe, đọc `$LASTEXITCODE`. Exit code lấy sau pipe là bằng chứng KHÔNG hợp lệ |
| `AC-05` | Kiểm chứng cùng phép đo đã bắt lỗi: gọi `listPublicJobProjection` với một project mà `clientCompany` là `null` trả về job có `industry` là `string` non-null, không ném exception | Test trong `AC-03` khẳng định đúng điều này bằng assertion trên `typeof job.industry === 'string'` |
| `AC-06` | Diff đúng phạm vi: chỉ 2 file thay đổi, đều thuộc allowlist 4.2 | `git diff --stat` trong HANDOFF; không có file nào ngoài `src/domains/job-board/` |
| `AC-07` | Không có SQL và không có thay đổi quyền: diff không chứa `CREATE POLICY`, `GRANT`, `ALTER TABLE`, `set_config`, và không chạm `with-public-db.ts` | `git diff` grep 4 từ khoá trên trả 0 dòng |
| `AC-08` | Không commit, không push, không deploy trong task này | `git log origin/main..HEAD` trả rỗng tại thời điểm viết HANDOFF; HANDOFF nói rõ deploy thuộc Owner |

### Traceability

| RQ | Steps | ACs |
|---|---|---|
| `RQ-01` | STEP-01, STEP-03 | AC-01, AC-05 |
| `RQ-02` | STEP-03 | AC-02 |
| `RQ-03` | STEP-02, STEP-04 | AC-03, AC-05 |
| `RQ-04` | STEP-03 | AC-06, AC-07 |
| `RQ-05` | STEP-06 | AC-06, AC-07 |
| `RQ-06` | STEP-05 | AC-04, AC-08 |

## 7. Risk và Rollback

| ID | Risk | Countermeasure |
|---|---|---|
| `RISK-01` | Tier 2 sửa bằng cách thêm `try/catch` cho route rồi trả danh sách rỗng — gate xanh, khách vẫn không thấy việc, và defect hỏng-thành-im-lặng của go-live-04 quay lại | `DEC-04` cấm; `AC-06` giới hạn diff trong `src/domains/job-board/`, mọi thay đổi trong `app/api/` là FAIL |
| `RISK-02` | Tier 2 "sửa" bằng cách bỏ join `clientCompany` khỏi `publicSelect`, làm đổi hình dạng truy vấn và mất đường quay lại cho `Q-01` | `DEC-01` + 4.2 cấm chạm `publicSelect`; `AC-06` phát hiện qua diff |
| `RISK-03` | Tier 2 viết migration cấp quyền cho `MKT` vì thấy "đúng nguyên nhân là RLS" | `DEC-02` cấm bằng lý do mức-dòng-không-mức-cột; `AC-07` grep `CREATE POLICY`/`GRANT`/`ALTER TABLE` trả 0 |
| `RISK-04` | Bằng chứng RED bị bịa hoặc bỏ qua: viết test SAU khi sửa rồi khai là RED-trước | `AC-03` yêu cầu hai lần chạy tách biệt và Tier 3 tái lập được bằng `git stash` riêng phần service. Đây chính là lỗ đã để lọt P0 lần này (`EV-10`) |
| `RISK-05` | Chạy `npx vitest run` trần thay vì lane unit: config mặc định ĐỌC `DATABASE_URL` từ `.env` (production) và thiếu `esbuild jsx automatic` nên đổ 24 test component oan | `RQ-06`/`AC-04` chốt đúng `npm run test:unit`; 24 fail ở lane mặc định là artifact cấu hình, không phải regression |
| `RISK-06` | Lấy exit code sau pipe (`cmd \| tail`) nên đọc exit code của `tail`, in `EXIT=0` ngay dưới dòng `failed` | `STEP-05`/`AC-04` bắt buộc đo không pipe và đọc `$LASTEXITCODE` |
| `RISK-07` | Tier 2 tự push để "cứu production cho nhanh" | `AC-08` đo `git log origin/main..HEAD` rỗng; deploy production là hành động của Owner theo `UNIFIED_PLAN` 9.1 |
| `RISK-08` | Tier 2 dọn hộ các file dirty của luồng khác trong lúc kiểm diff | 4.2 liệt kê đích danh; `STEP-06` yêu cầu DỪNG và báo, không tự dọn |

**Rollback:** một commit duy nhất, hai file, không migration, không đổi hợp đồng JSON. Hoàn tác bằng `git revert` trên chính commit của task. Nếu Owner chọn revert cả `d4928af` thay vì hotfix, task này chuyển `CANCELLED` và không thực thi.

## 8. Open Questions

| ID | Question | Owner | Ảnh hưởng nếu chưa trả lời |
|---|---|---|---|
| `Q-01` | Ngành nghề trên bề mặt công khai lấy từ đâu cho đúng thật? Ba lựa chọn: (a) giữ heuristic văn bản như sau hotfix; (b) denormalize `industry` xuống `outsourcing_projects` bằng một migration, ngành do admin chọn khi publish; (c) mở `client_companies` cho `MKT` — Tier 1 phản đối vì `DEC-02`. Không chặn hotfix | Owner | Không chặn. Sau hotfix facet ngành chạy bằng heuristic, dịch vụ đã khôi phục. Câu trả lời thuộc task kiến trúc bề mặt công khai |
| `Q-02` | Có cần một gate tự động cấm deref quan hệ Prisma không guard trên đường đọc công khai (lint rule hoặc test kiến trúc), để lỗi cùng họ không lọt lần nữa? Kiểu Prisma coi quan hệ bắt buộc là non-null nên `tsc` không bao giờ bắt được lớp lỗi này (`EV-08`) | Owner | Không chặn hotfix. Nếu bỏ qua thì mọi join mới trên `withPublicDb` vẫn có nguy cơ lặp lại đúng sự cố 31/08 |

## 9. Planner Resolution

Chấp nhận `PASS` từ Tier 3 Audit Round 1.
- Evidence hợp lệ, không mock, đo đạc trực tiếp trên file và CLI.
- Các AC-04 (gate tĩnh) và AC-06, AC-07 (giới hạn sửa đổi, quyền) thoả mãn.
- AC-08 không tịnh tiến HEAD hợp lý vì Owner sẽ chịu trách nhiệm deploy.

Task chuyển trạng thái `ACCEPTED`.

### Bổ chính 2026-08-31 — trạng thái deploy và trình tự thật

Append-only. Đoạn trên viết trước lúc push và có một câu không còn đúng: `AC-08` KHÔNG còn thoả. `HEAD` đã tịnh tiến và code đã lên production.

Trình tự thật, ghi đúng thứ tự để sau này truy vết được:

1. Tier 2 bàn giao `HANDOFF.md` với bằng chứng RED-trước-GREEN: `LASTEXITCODE=1` và `1416 passed (1417)` một fail ở trạng thái chưa sửa, rồi `1418 passed` sau khi sửa.
2. `AUDIT.md` từng tồn tại với verdict `PASS` và Tier 1 đọc toàn văn lúc 12:39, nhưng đến 12:48 bị truncate về 0 byte. Suốt 44 phút sau đó `verify-audit.ps1` trả `exit 2` với `ArgumentNullException`, nên Tier 1 TỪ CHỐI resolve trên artifact rỗng và không tự viết hộ Tier 3.
3. Tier 1 tự đo độc lập, không dựa vào relay: `npm run typecheck` exit 0; `npm run test:unit` exit 0 với `1418 passed (1418)` trên 92 file; `git diff --stat` đúng 2 file `49+/2-`; grep `CREATE POLICY|GRANT|ALTER TABLE|set_config` trên diff trả 0; và tự đọc toàn bộ diff của cả hai file.
4. Owner chỉ thị khôi phục dịch vụ trước, đóng artifact sau. Tier 1 commit path-scoped đúng 2 file và push `708506f..e0a70f7` lên `main`, tức deploy production. Đây là ngoại lệ do Owner quyết, không phải Tier 2 vượt rào.
5. Tier 3 phát lại `AUDIT.md` sau đó. Tier 1 chạy lại `verify-audit.ps1` và lần này `exit 0` với `[OK] Verdict: PASS`, nên `ACCEPTED` ở trên là hợp lệ tại thời điểm này.

Waiver được ghi đúng bản chất: người quyết định là Owner; evidence từng thiếu là `AUDIT.md` trên đĩa, nay đã có; tiêu chí bị vượt là `AC-08` và chỉ `AC-08`; residual risk là bản audit hiện tại được phát lại SAU khi code đã lên production, nên nó không còn là phép đo tiền-deploy. Không được kể lại rằng task này ACCEPTED trước khi push.

Điều kiện tiên quyết Tier 1 xác nhận từ đầu và vẫn đúng: task này KHÔNG cần DB thật, KHÔNG cần migration, KHÔNG cần credential live, nên `ENV_BLOCKED` chưa bao giờ là kết cục hợp lệ ở đây.

## 10. Revision Log

| Version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | 2026-08-31 | Lập contract hotfix P0 cho `/api/jobs` 500 trên production. 13 evidence, 6 decision, 6 requirement, 7 step, 8 acceptance criterion, 8 risk, 2 open question. Nguyên nhân chốt: join `client_companies` mới ở `d4928af` cộng deref không guard, dưới principal `MKT` không có policy SELECT nào trên bảng đó (`EV-04`..`EV-07`) nên quan hệ bắt buộc trả `null` lúc runtime trong khi kiểu Prisma khai non-null (`EV-08`) — vì vậy typecheck và 1416 unit test đều xanh mà production sập | Regression P0 sinh ra bởi lần push được Owner cho phép 31/08; cần đường sửa nhỏ nhất, không migration, không mở quyền |
