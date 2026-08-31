# TASK: hrp-v5-go-live-11-public-rpc-residual-grant

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-11-public-rpc-residual-grant` |
| Work type | `CODE` — một migration forward-only cộng một test tĩnh chống tái diễn |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | `0248948` |
| Modules | DB permission boundary — role `hrp_public_rpc`, hai hàm SECURITY DEFINER công khai |
| ADR references | MP-2 `DEC-08` DEFINER public RPC boundary; quy tắc least-privilege của M1-07B |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `verify-task ⇒ /code ⇒ /audit ⇒ /resolve ⇒ ACCEPTED` |
| Updated | `2026-08-31 15:40 +07` |

## 1. Outcome

### User-visible outcome

Không có. Bề mặt người dùng không đổi một pixel, không đổi một byte JSON. Đây là task thu hồi đặc quyền.

### Operator-visible outcome

Role `hrp_public_rpc` không còn thành viên nào. Trước task này, role đăng nhập đã chạy hai migration MP-2 vẫn là thành viên của `hrp_public_rpc`, nên nó **thừa hưởng** toàn bộ quyền của role đó: `SELECT, INSERT` trên `candidate_submissions` và `application_status_history`, `SELECT` trên ba bảng marketplace, cộng `USAGE ON SCHEMA public`. Membership đó không cần thiết cho bất cứ đường chạy nào ở runtime; nó chỉ cần trong đúng vài mili giây lúc chuyển quyền sở hữu hàm.

Hai hàm SECURITY DEFINER vẫn thuộc `hrp_public_rpc` và vẫn chạy: nộp đơn công khai và tra cứu công khai không đổi hành vi.

### Non-goals

- Không sửa thân của bất kỳ hàm nào, không `CREATE OR REPLACE FUNCTION`.
- Không sửa file migration đã tồn tại. Lịch sử migration là append-only.
- Không đổi schema: không thêm/bớt bảng, cột, index, policy, hay trạng thái RLS.
- Không đổi một dòng dữ liệu nào.
- Không thu hồi quyền của `app_user`, `app_user_writer`, hay bất kỳ role ứng dụng nào.
- Không đổi `DATABASE_URL`, không rotate credential, không tạo role mới.
- Không chạm code ứng dụng ngoài đúng một file test tĩnh mới.
- Không deploy, không chạy launch drill.

## 2. Evidence và Baseline

Mọi dòng dưới đây do Tier 1 đọc trực tiếp tại `0248948`.

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `prisma/migrations/20260831103000_marketplace_search_tracking_profile/migration.sql:49` và `:55` | Nâng quyền bằng `GRANT hrp_public_rpc TO session_user WITH SET TRUE`, rồi hạ bằng `GRANT ... WITH SET FALSE` — **không có `REVOKE`** | `WITH SET FALSE` chỉ tắt khả năng `SET ROLE`. Membership vẫn còn, và membership thừa hưởng quyền |
| `EV-02` | `prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql:241` và `:248` | **Cùng một idiom**, có từ 23/08, cho hai hàm `hrp_public_apply_submission` và `hrp_public_tracking_projection` | Đây là **pattern** bị copy, không phải sự cố một lần. Sửa một chỗ là chưa đóng |
| `EV-03` | `grep -rn hrp_public_rpc prisma/migrations` | Đúng **hai** lệnh `GRANT hrp_public_rpc TO` trong toàn bộ lịch sử migration, cả hai đều tới `session_user` qua `format()`. Không có lệnh nào cấp membership cho `app_user`, `app_user_writer` hay role ứng dụng khác | Thu hồi **toàn bộ** thành viên là an toàn: không có thành viên nào được cấp có chủ đích |
| `EV-04` | `20260823101500_mp2_apply_tracking/migration.sql:254-258` | `hrp_public_rpc` giữ `SELECT, INSERT` trên `candidate_submissions` và `application_status_history`, `SELECT` trên ba bảng marketplace | Đây chính là tập quyền đang rò qua membership. Nó gồm quyền ĐỌC bảng chứa PII ứng viên |
| `EV-05` | `20260829093000_mp2_public_rpc_schema_usage/migration.sql:13-14` | Có thêm `USAGE ON SCHEMA public` cho `hrp_public_rpc`, bọc trong `IF EXISTS` | Quyền rò gồm cả schema USAGE. Migration này KHÔNG cấp membership nên không nằm trong tầm sửa |
| `EV-06` | Đo live 31/08 bằng `curl` trên `www.hrpartner.vn`: `/api/public/applications/HRP-KHONG-TON-TAI-000` trả `404` | Cả `route.ts` và `getPublicTracking` đều không có `try/catch`, nên 404 chứng minh hàm tồn tại và chạy được trên `hrp-live` | Ba migration đã áp lên live. Task này sửa hiện trạng thật, không sửa giả thuyết |
| `EV-07` | Harness của mọi Agent trong repo này chặn mọi lệnh nối DB production | Không Agent nào áp được migration này bằng lệnh | Bước áp phải chạy trong Neon Console SQL Editor. Đây là ràng buộc môi trường, không phải điểm chờ quyết định |
| `EV-08` | `prisma/migrations` không có file nào tên chứa `revoke` | Chưa từng có migration thu hồi membership | File mới, không sửa file cũ |

## 3. Decisions

| ID | Decision | Lý do |
|---|---|---|
| `DEC-01` | Thu hồi **mọi** thành viên của `hrp_public_rpc` bằng vòng lặp trên `pg_auth_members`, KHÔNG chỉ `REVOKE ... FROM session_user` | Role chạy migration sửa lỗi có thể khác role đã chạy migration gây lỗi. `EV-03` chứng minh không thành viên nào được cấp có chủ đích, nên "về 0" là trạng thái đúng |
| `DEC-02` | Không sửa hai file migration cũ, dù chúng chính là nguồn lỗi | Lịch sử migration append-only. Sửa file đã áp làm lệch checksum của `_prisma_migrations` và làm mọi `prisma migrate` sau này vỡ |
| `DEC-03` | Migration này KHÔNG được chứa lệnh nào tác động tới thân hàm, tới policy, tới bảng, hay tới dữ liệu. Chỉ `REVOKE` membership cộng câu xác minh | Cùng bài học của go-live-06: chạy lại migration cũ để "sửa" một chỗ đã hạ cấp `hrp_project_visible_for` trong im lặng. Giữ bán kính bằng đúng một khái niệm |
| `DEC-04` | Idempotent bắt buộc: chạy lần thứ hai phải thành công và không đổi gì | Bước áp là thủ công trong Console. Người vận hành có thể dán hai lần |
| `DEC-05` | Thêm một test tĩnh đọc chính các file migration, FAIL nếu có file nào dùng `WITH SET FALSE` mà không có `REVOKE` role đó ở cùng file | `EV-02` cho thấy idiom này bị copy giữa hai migration cách nhau tám ngày. Không có hàng rào thì lần thứ ba sẽ tới. Bài học `DEC-06` của hotfix-02: chống tái diễn ở lớp DB phải bằng test tĩnh đọc mã nguồn, không bằng mock |
| `DEC-06` | Test tĩnh cho phép **ngoại lệ có tên** cho đúng hai file 23/08 và 31/08, dạng allowlist ghi rõ lý do "đã áp lên live, được đóng bằng migration của task này" | Hai file cũ không được sửa nên chúng sẽ mãi vi phạm. Không allowlist thì test đỏ vĩnh viễn và sẽ bị ai đó vô hiệu hoá |
| `DEC-07` | Bước áp lên `hrp-live` chạy trong Neon Console SQL Editor trên branch `hrp-live`, dán nguyên văn nội dung file migration | `EV-07`: harness chặn mọi lệnh nối DB production. Đây cũng đúng đường đã chứng minh được ngày 29/08 khi vá schema USAGE |
| `DEC-08` | KHÔNG chạy `prisma migrate deploy` để áp | Lệnh đó áp mọi migration đang chờ, không chỉ file này, và sẽ vỡ ở drift checksum. Bán kính vượt xa contract |
| `DEC-09` | Sau khi áp, phải đo lại **cả hai** đường công khai đi qua hai hàm DEFINER: tra cứu và nộp đơn | Nếu tôi sai về việc membership không cần thiết, triệu chứng là 500 ở đúng hai đường đó. Đo là cách duy nhất biết mình sai |
| `DEC-10` | Nếu sau khi áp mà một trong hai đường công khai trả 500, `ROLLBACK` bằng cách cấp lại membership đúng một role, rồi báo REVISION | Có đường lùi một câu lệnh. Không được để bề mặt công khai chết lần thứ ba trong một tuần |

## 4. Contract

| ID | Requirement |
|---|---|
| `RQ-01` | Tạo đúng một thư mục migration mới `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/` chứa đúng một file `migration.sql`. Không sửa, không xoá, không đổi tên migration nào đang có |
| `RQ-02` | `migration.sql` thu hồi membership của `hrp_public_rpc` khỏi mọi role đang là thành viên, bằng một khối `DO` lặp trên `pg_auth_members` và `pg_roles`, dùng `format('REVOKE hrp_public_rpc FROM %I', ...)` để trích dẫn định danh an toàn |
| `RQ-03` | `migration.sql` bọc toàn bộ trong `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc')` để chạy được trên môi trường chưa có role đó, và idempotent theo `DEC-04` |
| `RQ-04` | `migration.sql` KHÔNG chứa các token sau: `CREATE OR REPLACE FUNCTION`, `ALTER FUNCTION`, `CREATE POLICY`, `DROP`, `ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT` |
| `RQ-05` | `migration.sql` kết bằng một câu `SELECT` đếm số thành viên còn lại của `hrp_public_rpc`, có alias cột rõ nghĩa, để người vận hành đọc được kết quả ngay trong Console |
| `RQ-06` | Thêm test tĩnh `prisma/migrations-permission-hygiene.static.test.ts` đọc mọi `prisma/migrations/**/migration.sql` bằng filesystem thật; với mỗi file có chuỗi `WITH SET FALSE`, test FAIL trừ khi tên file nằm trong allowlist hằng của `DEC-06`, hoặc cùng file có `REVOKE` role tương ứng. Test cũng FAIL nếu allowlist chứa tên file không còn tồn tại |
| `RQ-07` | Test ở `RQ-06` phải nằm trong lane canonical `npm run test:unit`; nếu lane đó không tự bắt file, đăng ký đúng chỗ pattern của `vitest.unit.config.ts` yêu cầu |
| `RQ-08` | Áp `migration.sql` lên branch `hrp-live` theo `DEC-07`, dán nguyên văn, và ghi lại output của câu `SELECT` ở `RQ-05` vào HANDOFF |
| `RQ-09` | Sau khi áp, đo lại hai đường công khai đi qua hàm DEFINER theo `DEC-09` và dán nguyên văn mã HTTP vào HANDOFF |
| `RQ-10` | Không commit, không push. Task này không có uỷ quyền deploy. Bước áp DB không đi qua Git nên không cần deploy |

### Traceability

| RQ | STEP | AC |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-01 | AC-02 |
| RQ-03 | STEP-01 | AC-03 |
| RQ-04 | STEP-01 | AC-04 |
| RQ-05 | STEP-01 | AC-05 |
| RQ-06 | STEP-02 | AC-06 |
| RQ-07 | STEP-02 | AC-07 |
| RQ-08 | STEP-03 | AC-08 |
| RQ-09 | STEP-04 | AC-09 |
| RQ-10 | STEP-05 | AC-10 |

## 5. Execution Plan

| STEP | Nội dung |
|---|---|
| `STEP-01` | Viết `prisma/migrations/20260831160000_public_rpc_residual_grant_revoke/migration.sql` theo `RQ-01..RQ-05`. Header comment ghi: nguồn lỗi là idiom `WITH SET FALSE` ở hai migration MP-2, và lý do "về 0 thành viên" là trạng thái đúng |
| `STEP-02` | Viết test tĩnh `RQ-06`, chạy RED trước GREEN: trước khi thêm allowlist, test phải FAIL và in đúng tên hai file vi phạm; sau khi thêm allowlist, PASS. Dán cả hai output vào HANDOFF |
| `STEP-03` | Chạy `npm run typecheck` rồi `npm run test:unit`, đọc `$LASTEXITCODE` ngay sau mỗi lệnh, không pipe. Rồi áp migration theo `DEC-07`: mở Neon Console, chọn branch `hrp-live`, dán nguyên văn `migration.sql`, chạy, chụp output câu `SELECT` |
| `STEP-04` | Đo lại hai đường công khai: `curl` tới `https://www.hrpartner.vn/api/public/applications/HRP-KHONG-TON-TAI-000` phải trả `404`; và đường nộp đơn `POST` tới `/api/jobs/apply` với payload thiếu trường bắt buộc phải trả mã lỗi 4xx của validator, KHÔNG phải `500`. Nếu bất kỳ đường nào trả `500` thì thi hành `DEC-10` |
| `STEP-05` | Viết HANDOFF: bảng AC-01..AC-10 kèm lệnh, exit code và output nguyên văn; `git status --short -- prisma/` để chứng minh chỉ hai file mới; không commit, không push |

## 6. Acceptance

| AC | Cách đo | Ngưỡng PASS |
|---|---|---|
| `AC-01` | `git status --short -- prisma/` cộng `git diff --stat -- prisma/migrations` | Đúng hai đường dẫn mới xuất hiện: thư mục migration mới và file test tĩnh. **Không** file migration cũ nào ở trạng thái `M` |
| `AC-02` | Đọc `migration.sql` | Có khối `DO` lặp trên `pg_auth_members` join `pg_roles`, và có `format('REVOKE hrp_public_rpc FROM %I'` |
| `AC-03` | Áp lần thứ hai trong cùng session Console | Lần hai chạy thành công, câu `SELECT` cuối vẫn trả `0` |
| `AC-04` | `grep -nE 'CREATE OR REPLACE FUNCTION|ALTER FUNCTION|CREATE POLICY|DROP|ALTER TABLE|INSERT|UPDATE|DELETE|GRANT' migration.sql` | Zero match. Dán nguyên văn kết quả rỗng cộng exit code của grep |
| `AC-05` | Output câu `SELECT` cuối của `migration.sql` khi chạy trên `hrp-live` | Số thành viên còn lại = `0` |
| `AC-06` | Chạy test tĩnh hai lần quanh `STEP-02`: `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` | RED `LASTEXITCODE=1` với message nêu đúng hai tên file `20260823101500_mp2_apply_tracking` và `20260831103000_marketplace_search_tracking_profile`; GREEN `LASTEXITCODE=0` |
| `AC-07` | `npm run test:unit` | Exit 0; tổng số test **không thấp hơn 1421**; file test mới xuất hiện trong danh sách `Test Files` |
| `AC-08` | Output nguyên văn của Console sau khi dán, kèm timestamp | Lệnh chạy không lỗi, và output câu `SELECT` được dán. Chỉ nói "đã áp" mà không có output là FAIL |
| `AC-09` | `curl.exe -s -o /dev/null -w "%{http_code}"` trên hai đường của `STEP-04` | Tra cứu = `404`. Nộp đơn thiếu trường = mã 4xx. Bất kỳ `500` nào = FAIL cả task |
| `AC-10` | `git log origin/main..HEAD` cộng `git log -1 --stat` | `git log origin/main..HEAD` rỗng và không có commit mới nào do Tier 2 tạo. Tự commit là FAIL |
| `AC-11` | `npm run typecheck` | Exit 0 |

## 7. Risk

| ID | Risk | Mức | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | Tôi sai về việc membership không cần thiết ở runtime, thu hồi xong thì apply hoặc tracking trả 500 | Trung bình về xác suất, cao về tác động | `EV-04` và `EV-05` cho thấy quyền của `hrp_public_rpc` được dùng **bên trong** hàm SECURITY DEFINER, tức dưới danh nghĩa owner chứ không qua membership của caller. `AC-09` là phép đo bắt lỗi này ngay. `DEC-10` là đường lùi một câu lệnh |
| `RISK-02` | Người vận hành dán vào branch sai | Thấp | `DEC-07` chỉ đích danh branch `hrp-live`. Nhắc lại: branch default tên `snapshot-rls-off-dont-use` có RLS tắt, KHÔNG được dán vào đó |
| `RISK-03` | Test tĩnh của `RQ-06` bị viết theo hướng match lỏng rồi FAIL oan trên migration tương lai hợp lệ | Thấp | Điều kiện thoát thứ hai của `RQ-06` (cùng file có `REVOKE`) cho phép migration tương lai dùng đúng idiom mà không cần allowlist |
| `RISK-04` | `_prisma_migrations` không có dòng cho ba migration đã áp thủ công, nên `prisma migrate` sau này coi chúng là pending | Trung bình | Ngoài tầm task này. Ghi thành follow-up ở §9 chứ không tự sửa: sửa bảng ledger là hành động nguy hiểm hơn chính lỗi |
| `RISK-05` | Có thành viên thứ hai của `hrp_public_rpc` do ai đó cấp tay ngoài migration, và role đó đang thực sự cần | Thấp | `AC-05` in số lượng trước và sau. Nếu số trước lớn hơn 1, Tier 2 dừng và báo, không tự thu hồi mù |

## 8. Open Questions

| ID | Question | Trạng thái |
|---|---|---|
| `Q-01` | Có nên đưa `_prisma_migrations` về đồng bộ với ba migration đã áp thủ công? | Mở, không chặn task này. Ứng viên task riêng, cần Owner quyết vì nó ghi vào bảng ledger |
| `Q-02` | Hai hàm DEFINER hiện giữ quyền `SELECT` trên bảng chứa PII ứng viên rộng hơn mức chúng dùng. Có nên thu hẹp tiếp? | Mở, không chặn. Cần đọc thân hàm để biết tập cột thật, là một lượt least-privilege riêng |

## 9. Planner Resolution

Chưa có. Task vừa mở.

Phát hiện thuộc trách nhiệm Tier 1 cần ghi ngay: idiom `WITH SET FALSE` không phải lỗi của Tier 2. Nó có từ migration MP-2 ngày 23/08 và được copy sang migration 31/08. Contract MP-2 do Tier 1 viết không hề nêu yêu cầu thu hồi membership sau khi chuyển quyền sở hữu, nên không tier nào vi phạm contract. Đây là lỗ trong contract, và `RQ-06` tồn tại để lỗ đó không mở lại lần thứ ba.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 2026-08-31 | Mở task. Nguồn: Tier 1 tự đọc hai file migration sau khi Owner chất vấn cách tôi trình bày "điểm chờ Owner"; quyền tồn dư là phần duy nhất trong đó là defect thật |
