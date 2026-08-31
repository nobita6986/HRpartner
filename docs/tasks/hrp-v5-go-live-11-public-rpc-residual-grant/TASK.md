# TASK: hrp-v5-go-live-11-public-rpc-residual-grant

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-11-public-rpc-residual-grant` |
| Work type | `CODE` — một migration forward-only cộng một test tĩnh chống tái diễn |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Status | `READY_FOR_AUDIT` — execution round 2 đã giao HANDOFF 35507 byte, dòng cuối `READY_FOR_AUDIT`. Contract bump v1.1 ⇒ v1.2 để sửa hai defect do chính Tier 1 gây ra, KHÔNG mở execution round mới: bằng chứng round 2 vẫn hợp lệ nguyên vẹn |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent context |
| Baseline | `0248948` |
| Modules | DB permission boundary — role `hrp_public_rpc`, hai hàm SECURITY DEFINER công khai |
| ADR references | MP-2 `DEC-08` DEFINER public RPC boundary; quy tắc least-privilege của M1-07B |
| Current execution round | `2` |
| Current audit round | `2` — đang mở. `AUDIT.md` của round 1 là 0 byte VÀ untracked nên mất hẳn; không chặn vì round 1 đã `REVISION_REQUIRED` |
| Next gate | `/audit round 2` trên spec **v1.2** ⇒ `/resolve`. Bước áp DB là OP của Owner, không đi qua Git |
| Updated | `2026-09-01 01:50 +07` |

## 1. Outcome

### User-visible outcome

Không có. Bề mặt người dùng không đổi một pixel, không đổi một byte JSON. Đây là task thu hồi đặc quyền.

### Operator-visible outcome

Role `hrp_public_rpc` không còn **self-grant mang `INHERIT TRUE`** do hai migration MP-2 để lại. Membership quản trị do Neon (`cloud_admin`) cấp cho `neondb_owner`, mang `ADMIN TRUE, INHERIT FALSE, SET FALSE`, phải được giữ nguyên để còn đường quản trị role, rollback và chuyển owner cho migration tương lai. Chỉ record do `neondb_owner` tự cấp (`grantor=neondb_owner`, `ADMIN FALSE, INHERIT TRUE, SET FALSE`) mới là quyền tồn dư cần thu hồi.

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
| `DEC-01` | Thu hồi đúng self-grant dư bằng mẫu động `REVOKE hrp_public_rpc FROM %I GRANTED BY %I` cho record có `grantor = member`, `inherit_option = true`, `admin_option = false`, `set_option = false`; KHÔNG thu hồi record do `cloud_admin` cấp | Phép đo production `PLN-EV-01` cho thấy cùng `neondb_owner` có hai record độc lập. Thu hồi mọi membership sẽ lấy luôn `ADMIN OPTION` hợp lệ; migration Round 1 còn tự dừng vì đếm nhầm hai record thành hai thành viên lạ |
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
| `RQ-02` | `migration.sql` chỉ thu hồi self-grant dư của `hrp_public_rpc`: join `pg_auth_members` với role/member/grantor, chọn đúng record `grantor = member`, `inherit_option = true`, `admin_option = false`, `set_option = false`, rồi dùng `format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I', member, grantor)` để trích dẫn an toàn. Cấm `REVOKE` record do grantor khác member cấp |
| `RQ-03` | `migration.sql` bọc toàn bộ trong `IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc')`, idempotent theo `DEC-04`, fail-closed nếu có hơn một self-grant dư hoặc có record mang `INHERIT TRUE` nhưng không khớp hình dạng đã đo |
| `RQ-04` | `migration.sql` KHÔNG chứa các token sau: `CREATE OR REPLACE FUNCTION`, `ALTER FUNCTION`, `CREATE POLICY`, `DROP`, `ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`, `GRANT` |
| `RQ-05` | `migration.sql` kết bằng một câu `SELECT` tổng hợp bốn số có alias rõ nghĩa: tổng membership record, self-grant dư, record còn `INHERIT TRUE`, và record quản trị an toàn (`ADMIN TRUE, INHERIT FALSE, SET FALSE`). Trên `hrp-live`, ngưỡng sau áp là `1 / 0 / 0 / 1` |
| `RQ-06` | Thêm test tĩnh `prisma/migrations-permission-hygiene.static.test.ts` đọc mọi `prisma/migrations/**/migration.sql` bằng filesystem thật; với mỗi file có chuỗi `WITH SET FALSE`, test FAIL trừ khi tên file nằm trong allowlist hằng của `DEC-06`, hoặc cùng file có `REVOKE` role tương ứng. Test cũng FAIL nếu allowlist chứa tên file không còn tồn tại |
| `RQ-07` | Test ở `RQ-06` phải nằm trong lane canonical `npm run test:unit`; nếu lane đó không tự bắt file, đăng ký đúng chỗ pattern của `vitest.unit.config.ts` yêu cầu |
| `RQ-08` | Áp `migration.sql` lên branch `hrp-live` theo `DEC-07`, dán nguyên văn, và ghi lại output của câu `SELECT` ở `RQ-05` vào HANDOFF |
| `RQ-09` | Sau khi áp, đo lại hai đường công khai đi qua hàm DEFINER theo `DEC-09` và dán nguyên văn mã HTTP vào HANDOFF |
| `RQ-10` | Không commit, không push. Task này không có uỷ quyền deploy. Bước áp DB không đi qua Git nên không cần deploy |
| `RQ-11` | Thêm ở v1.2 để hợp thức hoá điều `RQ-07` đã hàm ý: `vitest.unit.config.ts` **được phép sửa**, nhưng chỉ ở mảng `include` để lane canonical bắt được test tĩnh dưới `prisma/`. Cấm đổi `exclude`, `env`, `esbuild` hay bất kỳ khoá nào khác. Lý do phải viết thành RQ: nếu không, thay đổi bắt buộc của `RQ-07` sẽ nằm ngoài allowlist và bị đọc thành vi phạm scope |

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
| RQ-11 | STEP-02 | AC-07 |

## 5. Execution Plan

| STEP | Nội dung |
|---|---|
| `STEP-01` | Viết lại `migration.sql` theo `RQ-01..RQ-05`. Header phải phân biệt hai record cùng member theo `grantor`; xoá luận điểm sai "về 0 thành viên". Migration phải giữ record `cloud_admin → neondb_owner` và chỉ xoá record `neondb_owner → neondb_owner` |
| `STEP-02` | Viết test tĩnh `RQ-06`, chạy RED trước GREEN: trước khi thêm allowlist, test phải FAIL và in đúng tên hai file vi phạm; sau khi thêm allowlist, PASS. Dán cả hai output vào HANDOFF |
| `STEP-03` | Chạy `npm run typecheck` rồi `npm run test:unit`, đọc `$LASTEXITCODE` ngay sau mỗi lệnh, không pipe. Rồi áp migration theo `DEC-07`: mở Neon Console, chọn branch `hrp-live`, dán nguyên văn `migration.sql`, chạy, chụp output câu `SELECT` |
| `STEP-04` | Đo lại hai đường công khai thật: tracking `GET /api/public/applications/{trackingCode-không-tồn-tại}` phải `404`; apply canonical `POST /api/public/jobs/{slug-không-tồn-tại}/applications` phải vào service/RPC và trả `404 JOB_NOT_AVAILABLE`, không phải `500`. Endpoint retired `/api/jobs/apply` chỉ là phép đo phụ `410`, không được dùng làm bằng chứng RPC |
| `STEP-05` | Viết HANDOFF: bảng AC-01..AC-10 kèm lệnh, exit code và output nguyên văn; `git status --short -- prisma/` để chứng minh chỉ hai file mới; không commit, không push |

## 6. Acceptance

| AC | Cách đo | Ngưỡng PASS |
|---|---|---|
| `AC-01` | `git status --short -- prisma/` cộng `git diff --stat -- prisma/migrations` | Đúng hai đường dẫn mới xuất hiện: thư mục migration mới và file test tĩnh. **Không** file migration cũ nào ở trạng thái `M` |
| `AC-02` | Đọc `migration.sql` | Có khối `DO` phân biệt `member` và `grantor`, match đúng self-grant dư, và có `format('REVOKE hrp_public_rpc FROM %I GRANTED BY %I'` |
| `AC-03` | Áp lần thứ hai trong cùng session Console | Lần hai chạy thành công; bảng cuối vẫn là `total=1, residual_self_grant=0, inheritable=0, safe_admin=1` |
| `AC-04` | `grep -nE '\bGRANT\b' migration.sql` cộng `grep -nE 'CREATE OR REPLACE FUNCTION\|ALTER FUNCTION\|CREATE POLICY\|DROP\|ALTER TABLE\|INSERT\|UPDATE\|DELETE' migration.sql`, cả hai **case-sensitive** | Zero match ở **cả hai** lệnh. Dán nguyên văn kết quả rỗng cộng exit code. **Ghi rõ, sửa ở v1.2:** literal `GRANTED BY` mà `RQ-02` và `AC-02` bắt buộc có **chứa** chuỗi con `GRANT`, nên gộp `GRANT` vào cùng danh sách như v1.0/v1.1 làm hai tiêu chí tự phủ định nhau. Ranh giới đúng là **token** `GRANT` đứng một mình, tức `\bGRANT\b`, chứ không phải chuỗi con. `GRANTED` là một token khác nên không khớp `\bGRANT\b` |
| `AC-05` | Output câu `SELECT` cuối của `migration.sql` khi chạy trên `hrp-live` | Chính xác `total=1, residual_self_grant=0, inheritable=0, safe_admin=1`; dòng còn lại có `grantor=cloud_admin`, `member=neondb_owner`, `ADMIN=true, INHERIT=false, SET=false` |
| `AC-06` | Chạy test tĩnh hai lần quanh `STEP-02`: `npx vitest run --config vitest.unit.config.ts prisma/migrations-permission-hygiene.static.test.ts` | RED `LASTEXITCODE=1` với message nêu đúng hai tên file `20260823101500_mp2_apply_tracking` và `20260831103000_marketplace_search_tracking_profile`; GREEN `LASTEXITCODE=0` |
| `AC-07` | `npm run test:unit` | Exit 0; tổng số test **không thấp hơn 1421**; file test mới xuất hiện trong danh sách `Test Files` |
| `AC-08` | Output nguyên văn của Console sau khi dán, kèm timestamp | Lệnh chạy không lỗi, và output câu `SELECT` được dán. Chỉ nói "đã áp" mà không có output là FAIL |
| `AC-09` | `curl.exe` trên hai đường canonical của `STEP-04` | Tracking = `404`; apply canonical = `404 JOB_NOT_AVAILABLE`; retired endpoint = `410` chỉ để inventory. Bất kỳ `500` nào = FAIL cả task |
| `AC-10` | `git log origin/main..HEAD` cộng `git log -1 --stat` | `git log origin/main..HEAD` rỗng và không có commit mới nào do Tier 2 tạo. Tự commit là FAIL |
| `AC-11` | `npm run typecheck` | Exit 0 |

## 7. Risk

| ID | Risk | Mức | Giảm thiểu |
|---|---|---|---|
| `RISK-01` | Tôi sai về việc membership không cần thiết ở runtime, thu hồi xong thì apply hoặc tracking trả 500 | Trung bình về xác suất, cao về tác động | `EV-04` và `EV-05` cho thấy quyền của `hrp_public_rpc` được dùng **bên trong** hàm SECURITY DEFINER, tức dưới danh nghĩa owner chứ không qua membership của caller. `AC-09` là phép đo bắt lỗi này ngay. `DEC-10` là đường lùi một câu lệnh |
| `RISK-02` | Người vận hành dán vào branch sai | Thấp | `DEC-07` chỉ đích danh branch `hrp-live`. Nhắc lại: branch default tên `snapshot-rls-off-dont-use` có RLS tắt, KHÔNG được dán vào đó |
| `RISK-03` | Test tĩnh của `RQ-06` bị viết theo hướng match lỏng rồi FAIL oan trên migration tương lai hợp lệ | Thấp | Điều kiện thoát thứ hai của `RQ-06` (cùng file có `REVOKE`) cho phép migration tương lai dùng đúng idiom mà không cần allowlist |
| `RISK-04` | `_prisma_migrations` không có dòng cho ba migration đã áp thủ công, nên `prisma migrate` sau này coi chúng là pending | Trung bình | Ngoài tầm task này. Ghi thành follow-up ở §9 chứ không tự sửa: sửa bảng ledger là hành động nguy hiểm hơn chính lỗi |
| `RISK-05` | Có record khác ngoài đúng hai record production đã đo, hoặc có record `INHERIT TRUE` do grantor khác member | Thấp | Migration fail-closed theo hình dạng record, không đếm thô. Không đụng bất kỳ record lạ nào; in inventory và trả `REVISION_REQUIRED` |

## 8. Open Questions

| ID | Question | Trạng thái |
|---|---|---|
| `Q-01` | Có nên đưa `_prisma_migrations` về đồng bộ với ba migration đã áp thủ công? | Mở, không chặn task này. Ứng viên task riêng, cần Owner quyết vì nó ghi vào bảng ledger |
| `Q-02` | Hai hàm DEFINER hiện giữ quyền `SELECT` trên bảng chứa PII ứng viên rộng hơn mức chúng dùng. Có nên thu hẹp tiếp? | Mở, không chặn. Cần đọc thân hàm để biết tập cột thật, là một lượt least-privilege riêng |

## 9. Planner Resolution

### Round 1 — `REVISION_REQUIRED`

Tier 1 không chấp nhận migration Round 1 và **cấm áp bản 103 dòng hiện tại lên production**.

| Finding | Evidence độc lập của Tier 1 | Quyết định |
|---|---|---|
| `PLN-01` — target membership sai | Đo trực tiếp `hrp-live` bằng admin connection ngày 31/08: PostgreSQL `18.6`; hai record cùng member `neondb_owner`: `(grantor=cloud_admin, admin=t, inherit=f, set=f)` và `(grantor=neondb_owner, admin=f, inherit=t, set=f)` | Giữ record thứ nhất; chỉ thu hồi record thứ hai bằng `GRANTED BY`. Sửa `DEC-01`, `RQ-02`, `RQ-05`, `AC-02/03/05` theo v1.1 |
| `PLN-02` — migration Round 1 không chạy được | `v_before` đếm row và nhận `2`, sau đó `RAISE EXCEPTION` vì `v_before > 1` | Tier 2 viết lại preflight theo hình dạng record, không đếm thô |
| `PLN-03` — AC-09 đo endpoint retired | `/api/jobs/apply` trả `410` cố định và không chạm RPC | Dùng canonical `/api/public/jobs/{slug}/applications` làm bằng chứng blocking |
| `PLN-04` — audit deliverable không tồn tại | `AUDIT.md` trong workspace có kích thước `0` byte lúc Tier 1 đo, trái báo cáo 6.449 byte | Tier 3 phải tạo lại `AUDIT.md` Round 2 và chạy `verify-audit`; không reuse verdict Round 1 |

Lưu ý trách nhiệm: idiom `WITH SET FALSE` có từ contract MP-2, không phải lỗi riêng của Tier 2. Nhưng sau `F-01/F-02`, Tier 1 có trách nhiệm sửa contract trước khi cho phép tác động production. Cú pháp `REVOKE { INHERIT } OPTION FOR` và `GRANTED BY` được PostgreSQL 18 hỗ trợ; v1.1 chọn `REVOKE` đúng self-grant để dọn hẳn row dư, đồng thời bảo toàn auto-admin grant của Neon.

`PLN-05` — **Tier 1 phiên 01/09 tái xác nhận quyền sở hữu resolution này, kèm một giới hạn phải nói thẳng.** Khối `PLN-01..PLN-04` không do phiên này viết; nó xuất hiện trong worktree ở trạng thái chưa commit. Tôi đã đọc lại toàn bộ và **giữ nguyên nội dung**, vì lập luận đứng vững độc lập với phép đo: hai record cùng member nhưng khác grantor đúng là hình dạng của Neon, trong đó `cloud_admin` cấp auto-admin mang `ADMIN TRUE, INHERIT FALSE`, còn idiom `WITH SET FALSE` ở hai migration MP-2 sinh ra self-grant mang `INHERIT TRUE` — chỉ record thứ hai mới là quyền tồn dư. Thu hồi toàn bộ membership như v1.0 yêu cầu sẽ lấy luôn đường quản trị role, nên v1.0 thực sự sai và bản thu hẹp của v1.1 thực sự đúng.

Nhưng **`PLN-01` không được dùng làm bằng chứng load-bearing**: phiên Tier 1 này KHÔNG tái lập được nó, vì harness chặn mọi lệnh nối DB production, nên tôi không tự đọc được `pg_auth_members` trên `hrp-live`. Hệ quả bắt buộc: bộ số `1 / 0 / 0 / 1` ở `RQ-05` và `AC-05` là **tiên đoán cần xác nhận tại thời điểm áp**, không phải sự thật đã kiểm. Contract vẫn an toàn vì `RQ-03` bắt migration fail-closed theo hình dạng record: nếu thực tế khác hình dạng đã ghi, migration phải dừng và trả `REVISION_REQUIRED` thay vì thu hồi mù. Tier 2 phải dán nguyên văn inventory trước và sau khi áp; nếu inventory trước không khớp `PLN-01` thì đó là dữ kiện mới của contract, không phải cớ để bỏ qua.

Bổ sung cho `PLN-04`: `AUDIT.md` của round 1 vừa **0 byte và untracked** (`git ls-files` trả rỗng) ⇒ **không cứu được bằng `git restore`**, nội dung mất hẳn. Đây là lần thứ năm hiện tượng này xảy ra trong hai ngày. Vì round 1 đã `REVISION_REQUIRED`, việc mất file đó **không chặn tiến độ**: bước kế tiếp là `/code` round 2, không phải audit lại round 1.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v1.0 | 2026-08-31 | Mở task. Nguồn: Tier 1 tự đọc hai file migration sau khi Owner chất vấn cách tôi trình bày "điểm chờ Owner"; quyền tồn dư là phần duy nhất trong đó là defect thật |
| v1.1 | 2026-08-31 | Round 1 `REVISION_REQUIRED`: bằng chứng live có hai record cùng member nhưng khác grantor/options. Thu hẹp migration sang self-grant do member tự cấp; giữ nguyên auto-admin grant của Neon; sửa phép đo apply canonical và yêu cầu Tier 3 tạo lại AUDIT bị 0 byte |
| v1.1 | 2026-09-01 | **Không bump version** — chỉ thêm `PLN-05` vào §9. Tier 1 phiên 01/09 tái xác nhận sở hữu resolution do một luồng Planner khác viết trong worktree, giữ nguyên nội dung, nhưng hạ `PLN-01` xuống mức tiên đoán cần xác nhận vì phiên này không nối được DB production, và ghi rằng AUDIT round 1 là untracked nên mất hẳn |
| v1.2 | 2026-09-01 | **Bump để sửa hai defect của chính Tier 1, KHÔNG mở execution round mới — bằng chứng round 2 vẫn hợp lệ nguyên vẹn.** (1) `AC-04` cũ cấm chuỗi con `GRANT`, trong khi `RQ-02` và `AC-02` **bắt buộc** literal `GRANTED BY`, mà `GRANTED BY` chứa `GRANT` ⇒ hai tiêu chí tự phủ định nhau, không cách nào cùng đạt. Ranh giới đúng là **token** `\bGRANT\b`, và `GRANTED` là token khác nên không khớp. Tier 1 tự tái lập: grep nguyên văn của `AC-04` cũ, **case-sensitive**, trả đúng `1` match ở dòng `143` là chính câu `REVOKE ... GRANTED BY`; còn `\bGRANT\b` trả `0`. (2) Thêm `RQ-11` hợp thức hoá việc sửa `vitest.unit.config.ts`, điều mà `RQ-07` đã hàm ý nhưng allowlist chưa nêu, chỉ cho phép chạm mảng `include` | Tier 2 phát hiện và **không** đổi literal để làm xanh gate, thay vào đó dán cả phép đo giữ đúng ý định rồi đề nghị Tier 1 sửa contract. Đó là cách xử đúng: gate sai thì sửa gate, không bẻ mã cho khớp gate |
