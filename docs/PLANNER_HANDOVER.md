# TIER 1 LIVING HANDOFF v2.1 — HRP V5

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-03 17:20 Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: V5 go-live truth-and-surface. Hàng đợi Tier 2 TUẦN TỰ, một slot một lúc theo quyết định 27/08. Contract 15 tương phản AA bề mặt công khai đã ACCEPTED và đã lên `main` ở commit `ae6e615`, tức lỗi AA đang in cho khách vô danh đã hết. Chuỗi còn HAI contract đã viết và đã gate PASS: `hrp-v5-go-live-16-internal-contrast-focus` `v1.0` GIAO ĐƯỢC NGAY vì cửa `RISK-01` của nó vừa mở, và 07 launch proof `v1.5` nằm CUỐI chuỗi. Thứ tự bắt buộc là 16 rồi 07. Trước 07 còn NĂM contract phải viết, xem `next_planner_candidate`. Cổng cuối vẫn là mục 13 credential hygiene, đứng sát lúc công bố.
current_task: `hrp-v5-go-live-16-internal-contrast-focus` — audit round `1` BỊ TRẢ, và Tier 1 tự đo lại toàn bộ. BẢN GIAO CỦA TIER 2 LÀNH: `npm run test:unit` exit `0` với `104` tệp và `1611` test do CHÍNH Tier 1 chạy; `npm run typecheck` đỏ với ĐÚNG MỘT dòng `error TS` quy về `new-ui/components/JobCard.tsx`, và `tsc --noEmit` với `new-ui` bị loại ra exit `0` với `0` lỗi. `new-ui/` CHƯA TỪNG được commit (`git log -- new-ui/` rỗng, `git ls-tree HEAD -- new-ui` rỗng) và ghi lúc `2026-09-02 23:19:10`, tức nửa `typecheck` đã đỏ ở baseline và không Tier 2 nào làm nó xanh được mà không phạm `§4.2`. LÝ DO TRẢ AUDIT, nặng nhất là con số: bản audit ghi `1590` test ở hai chỗ, còn cây thật có `1611` — `1590` là mốc baseline của contract 15 và hàng rào mới góp đúng `21` test nên `1590 + 21 = 1611` khép kín chuỗi, tức `1590` bất khả quan sát. `verify-audit.ps1` chỉ thẳng vào đó bằng `S-10` và tự kết `Tier 1 MUST NOT resolve on this AUDIT.md`. Cộng ba ô `AC-05`, `AC-06`, `AC-07` PASS dựng trên `git diff` TRẦN, thứ trả RỖNG khi Tier 2 đang ký gửi trong INDEX. NĂM defect của contract là của TIER 1, đã ghi thành `PLN-23` tới `PLN-28` append-only ở `v1.0`, KHÔNG bump.
task_path: docs/tasks/hrp-v5-go-live-16-internal-contrast-focus/TASK.md
spec_version: 16 = `v1.0`, execution round `1` đã giao, audit round `1` BỊ TRẢ. TUYỆT ĐỐI KHÔNG bump: `verify-audit.ps1` `A-02` so spec version giữa TASK và AUDIT nên một lần bump làm gate FAIL oan và đốt thêm một round. Năm defect contract tìm thấy sau audit đã ghi thành ruling append-only `PLN-23`..`PLN-28`, lời văn của các ô AC giữ nguyên để còn đọc được cái Tier 3 đã audit, điều CHI PHỐI là phương pháp trong ruling. 17 = `v1.0` READY, neo `80f6933`, gate PASS. 18 = `v1.0` READY, neo `80f6933`, gate PASS. 19 = `v1.0` DRAFT, neo `80f6933`, chặn bởi Owner. test-01 = `v1.0` READY, neo `80f6933`, gate PASS. 15 = `v1.2` ACCEPTED đóng hẳn. 07 = `v1.5`, neo `3a95c29`, cửa sổ bump còn MỞ vì `Current audit round` bằng `0`. 09 = `v1.2` ACCEPTED. 14 đóng ở `v1.1`.
task_status: hrp-v5-go-live-16-internal-contrast-focus = `READY_FOR_EXECUTION` `v1.0`, execution round `1`, audit round `1` bị trả. Tier 2 KHÔNG có việc — mọi phép đo mức mã đã ĐẠT khi Tier 1 chạy lại, nên ghi `REVISION_REQUIRED` ở đây sẽ ra lệnh sai cho Tier 2. Việc còn lại là round `2` của Tier 3. LƯU Ý CƠ HỌC: `verify-task.ps1` báo ĐỎ trên chính contract 16 ở `T-03` (ba ô dùng `git diff` trần) và `T-05` (`AC-10` không gọi tên phép đo) — đó là vì gate đã siết SAU khi contract được viết, cả hai đã có phương pháp thay thế ở `PLN-24` và `PLN-28`, và hệ quả kéo theo là `verify-handoff.ps1` báo `H-04` đỏ trên HANDOFF round 1; Tier 2 khai đúng và round 2 không phải xử lý điều đó. hrp-v5-go-live-17-rls-required-relation-sweep = READY, giao được ngay. hrp-v5-go-live-18-public-surface-hardening = READY, giao được ngay, và Tier 1 đề xuất CỘNG hàng rào tĩnh của `Q-03` contract 19 vào đây. hrp-v5-go-live-19-tracking-pii-db-mask = DRAFT, đề xuất dịch sang SAU RA MẮT, lý do ở `blocking_owner`. hrp-v5-test-01-browser-lane = READY, xếp cuối. hrp-v5-go-live-07-marketplace-launch-proof = READY `v1.5`, cuối chuỗi, và trong lúc drill chạy thì KHÔNG deploy. 15, 09, 14 đóng hẳn.
current_gate: TIER_3_AUDIT
next_command: Giao `/audit hrp-v5-go-live-16-internal-contrast-focus` cho Tier 3 làm round `2`, kèm `R-01` nguyên văn KHÔNG commit KHÔNG push KHÔNG deploy KHÔNG sửa mã, cộng năm chỉ thị. MỘT, đọc `PLN-23` tới `PLN-28` ở §9 TRƯỚC khi đo: năm ô AC đã có phương pháp thay thế, và đo theo lời văn cũ sẽ ra verdict sai. HAI, mọi con số phải do chính audit ĐO — `1590` của round 1 là mốc của một task KHÁC, cây thật có `1611`; `S-10` của `verify-audit.ps1` FAIL đúng vì điều này và nó là lỗi phải sửa đầu tiên. BA, CẤM `git diff` trần: dùng `git diff --cached --numstat` cộng `git status --porcelain` rồi hợp hai danh sách, vì Tier 2 ký gửi bản giao trong INDEX suốt cả round. BỐN, `§5 Coverage Gaps` phải suy ra CƠ HỌC từ bảng AC, mỗi ô không PASS là một dòng. NĂM, `git add` `AUDIT.md` NGAY khi ghi xong cộng một bản copy trong `evidence/`, và trước khi kết thúc phải so số byte worktree với `git show :path` vì tệp đó đã bị cắt về 0 byte tám lần. Sau khi 16 ACCEPTED và deploy xong, thứ tự slot Tier 2 là 18 rồi 17 rồi 07 rồi test-01.
audit_lane_parallel: ĐÓNG HẲN. hrp-v5-go-live-10-admin-ui-repair ACCEPTED cả round 1 và round 2 trên spec v1.0, KHÔNG bump lần nào, mã đã deploy 1af4eff và xác nhận SỐNG. Audit round 2: Tier 1 tự chạy verify-audit ra Verdict PASS exit 0 trên file 9089 byte, TASK.md byte-identical với HEAD nên Tier 3 không ghi vào ô Planner, rev-list bằng 0 nên Tier 3 không commit không push, và AUDIT.md đã commit 5d11c49 TRƯỚC khi viết resolution theo R-02. Sáu phép đo SC-10..SC-15 của Tier 1 đều khớp AUDIT, mạnh nhất là SC-11 và SC-12 trên bundle production: trước deploy d3f6d0d25f5c04fc.css 69242 byte có 0 lượt alias, sau deploy 71260eaaf56163fe.css 70265 byte có 27 lượt alias sống cộng transform none important và nav-item-lift, còn chuỗi comment trong bundle bằng 0 vì minifier bóc sạch comment — nên alias có mặt trong bundle là bằng chứng máy rằng nó là CSS SỐNG. Bốn finding F-08..F-11 đều ACCEPT_FIX: F-08 là Tier 3 vẫn đo R2-01 R2-02 bằng cách đọc nguồn thô, chấp nhận được chỉ vì phép bóc comment giờ nằm trong chính bộ test và Tier 3 đã thấy nó RED rồi GREEN; F-09 là AC-16 trích đúng con số của HANDOFF và thiếu exit code; F-10 là §7 ghi round 1 là FAIL và ghi Tier 2 tạo round 2, cả hai đều SAI vì round 1 verdict là PASS đã được ACCEPTED và round 2 do Tier 1 mở — khác biệt đó là giữa hàng rào bắt được lỗi và hàng rào bỏ lọt lỗi, sự thật là bỏ lọt; F-11 là tính độc lập chỉ một phần vì Owner chỉ định phiên Tier 1 kiêm vai Tier 2, ghi thẳng để sau này không ai dẫn round này ra làm bằng chứng ba tầng vẫn tách
previous_accepted: hrp-v5-go-live-15-public-contrast-aa — ACCEPTED 03/09 trên spec `v1.2`, push `ae6e615`. Giới hạn phải nhớ khi dẫn lại round này: `AUDIT.md` của Tier 3 bị TRẢ hai vòng và KHÔNG phải cơ sở của quyết định, phép đo là của Tier 1 — đừng dẫn 15 ra làm bằng chứng dây chuyền ba tier đủ khâu. Dư nợ đã ghi: cặp `3.153:1` vẫn còn sống ở `detail-apply-cta.tsx` và `app/login/login-form.tsx` cộng khối `.pub-*` chết trong `globals.css` — 16 nhận phần `login-form`, phần còn lại là contract sau. Trước đó hrp-v5-go-live-09-public-board-architecture ACCEPTED 02/09 trên `v1.2`, mã lên production `bb8a983`, và giới hạn của nó vẫn đứng: lane integration CHƯA TỪNG chạy vì không có `DATABASE_URL_TEST`, nên 09 không bảo đảm gì về RLS hay hình dạng dòng THẬT của Prisma — đó là dư nợ của lane quét `F-05`. Trước đó 14 push `8ca2ee1`, 11 push `fb993a7` với số grant thật `total=1` `residual_self_grant=0` `inheritable=0` `safe_admin=1`, rồi 10, 12, 13, 05 ở `e0c14ca`, 08 ở `v1.3` — tất cả ACCEPTED và đóng hẳn.
next_planner_candidate: HÀNG ĐỢI CONTRACT ĐÃ CẠN cho go-live, cập nhật 03/09. ĐÃ ĐÓNG: go-live-05, 08, 09, 10, 11, 12, 13, 14, 15. ĐÃ VIẾT và gate PASS, đang chờ slot: 16 (đang audit), 17 `F-05`, 18 hardening, 07 launch proof, cộng 19 ở DRAFT chờ Owner và test-01 xếp cuối. HAI món trong hàng đợi năm-món cũ đã bị BÁC BỎ bằng phép đo, không viết contract: MỘT, `/admin/jobs` đọc sai slot — `go-live-03` đã đóng ngày 30/08, `grep -n 'project.quota' app/admin/jobs/page.tsx` trả exit `1`, tiêu đề cột là "Slot trống" và tổng tính bằng `slotsNeeded - slotsFilled` ở `app/admin/jobs/page.tsx:55`. HAI, `Q-01` probe tìm kiếm phơi `staffingOrder.description` — SAI trên baseline: `keywordHaystack` ở `src/domains/job-board/public.service.ts:558` cố ý KHÔNG gộp `description` và có comment giải thích ngay tại `:550`; consumer còn lại duy nhất là `searchableTextOf` chảy vào `classifyJobType`, một enum ĐÓNG ba giá trị, nên cắt kênh đó sẽ đổi nhãn của bản ghi đang in đúng — đúng lớp lỗi `go-live-14`. Chi tiết ở `EV-09` và `EV-10` của contract 18. Dư nợ đã ghi thành `Q-` chứ không thành contract: limiter `Map` theo instance ở `middleware.ts:31` cho đường `/worker`; mã `429` thật cho trang chi tiết, chờ Next có middleware Node runtime; cặp `3.153:1` còn sót ở `detail-apply-cta.tsx` cùng khối `.pub-*` chết. Lane `ui-01` mở SAU go-live: bản warm tonal ở `stash@{0}` cộng `scratch/stash-globals.diff` cộng `new-ui/` gộp thành một contract theme-migration, và đừng `git gc --prune` trước khi tiêu thụ stash đó. Lane affiliate mở SAU go-live: trả lời các default §4.2 của `docs/aff_plan.md` rồi viết `aff-01` vào thư mục `docs/tasks/hrp-v5-aff-01-affiliate-code-issuing/` đang rỗng. Một việc dọn nhỏ không phải contract: bốn task `hrp-portal-*` đều `Updated 2026-08-20` và đều đã có `AUDIT.md` cộng `HANDOFF.md` mà vẫn mang nhãn trạng thái sống từ trước pivot V5 ngày 22/08 — cần một lượt sửa nhãn.
blocking_owner: BA điểm. (1) Chỉ một Tier 2 tại một thời điểm theo quyết định 27/08 nên cả hàng đợi chạy tuần tự. (2) **Contract 19 che PII ở tầng SQL — Tier 1 ĐỀ XUẤT DỊCH SANG SAU RA MẮT, và đây là khuyến nghị chứ không phải quyết định.** Lý do: giá trị nó thêm là bịt kênh raw ở tầng database, nhưng cái giá là một bản sao thứ hai của thuật toán che viết bằng SQL mà KHÔNG chứng minh được trên Postgres thật, vì lane integration chưa từng chạy do thiếu `DATABASE_URL_TEST`; và vì lớp che ở Node che LẦN HAI trên kết quả của SQL, một chỗ lệch nhỏ giữa hai bản sẽ đổi chuỗi in ra cho người dùng mà không lỗi nào được ném — `\s` của JavaScript là Unicode còn lớp POSIX của Postgres là ASCII, đúng một chỗ lệch như thế. Phương án `Q-03` đạt được phần lớn giá trị với gần như không rủi ro: giữ che ở Node, cộng một hàng rào tĩnh khẳng định caller duy nhất của `hrp_public_tracking_profile` che cả hai trường và DTO công khai không có khoá thô. Đề xuất: cộng hàng rào ấy vào contract 18 ngay lượt này, giữ 19 ở `DRAFT` với điều kiện thi hành là `DATABASE_URL_TEST` phải tồn tại trước. Nếu Owner chọn làm 19 ngay thì cần mở trần migration và chấp nhận giới hạn `DEC-07`. (3) Chưa tìm ra thứ gì cắt `AUDIT.md` về 0 byte: cơ chế đã biết — một buffer editor rỗng được extension lưu đè qua workspace-edit API — nhưng CHƯA biết extension nào; việc của Owner là đóng mọi tab `AUDIT.md` trong CẢ VS Code và Cursor, tắt `openai.chatgpt` cùng `google.google-antigravity` cho workspace này làm phép thử quyết định, và ngừng mở repo trong hai editor cùng lúc. Vệ sinh index cần Owner biết: `S-16` báo `9` path staged nằm ngoài thư mục task — sáu là bản giao hợp lệ của Tier 2, ba còn lại là `gate-lib.ps1`, `verify-handoff.ps1`, `verify-pipeline.ps1` của luồng làm gate; không tier nào được commit ba path ấy kèm artifact của mình. Các bước OP chạy song song được: `R-07` task 13 tra một mã tra cứu thật; dọn DEMO cho hai trong năm slug công khai còn thiếu prefix cộng dọn `DRILL-MKT` sau drill 07; smoke admin `R-03`; chữ ký §11 của runbook launch. Mục 13 credential hygiene là CỔNG CUỐI, đứng ngay trước lúc công bố, và theo quyết định Owner thì nó KHÔNG chặn task nào.
product_override: /bcc retired; production payroll/payslip belongs to the separate salary app; PAY-01..08 = DEFERRED_FINAL and does not block HRP go-live
cursor_note: Bài học lớn nhất của 01/09, và nó là bài học về CHÍNH TIER 1: một phép đo có thể THẬT, con số ĐÚNG, mà kết luận SAI. Tôi đếm được đúng 22 dòng var(--color- trong khoảng dòng 113 tới 136 của app/globals.css và ghi nó thành SC-02 làm bằng chứng ACCEPTED — nhưng cả 22 dòng đó nằm bên trong một comment CSS, nên chúng sinh ZERO byte trong bundle và bản deploy 474f3dc là no-op. Câu hỏi sàng lọc phải hỏi từ nay: nếu thứ này bị comment out, hoặc bị mock, hoặc không bao giờ được gọi, thì phép đo của tôi có ĐỔI không? Nếu không đổi thì phép đo đó rỗng. Với CSS và asset thì chỉ có hai dạng bằng chứng hợp lệ: bóc comment rồi mới đếm trên nguồn, hoặc đếm trên artifact ĐÃ BIÊN DỊCH trong .next/static/css hoặc trên bundle live, vì minifier bóc hết comment nên chuỗi có mặt trong bundle là bằng chứng nó sống. Cùng họ với hai bài học cũ: tsc không phải hàng rào khi đổi khoá DTO, và mock là bằng chứng rỗng cho lỗi tầng query engine. Thứ DUY NHẤT tố giác lần này là chênh lệch git diff --stat, 60 insertions thay vì 101, thấy được vì tôi đo lại scope ngay trước lúc push dù task đã ACCEPTED và mọi gate đã xanh — nên đừng bao giờ bỏ qua lệch số dòng. Ba bài học cũ vẫn thi hành: AUDIT.md có thể tồn tại thật rồi bị cắt về 0 byte một phút sau nên resolution phải đứng trên phép đo do chính Tier 1 chạy và bước 0 là đọc SỐ BYTE, và commit AUDIT.md ngay khi đọc xong vì file untracked bị cắt là mất hẳn; sửa sai sót của audit SAU khi audit đã chạy thì KHÔNG bump spec vì verify-audit so spec giữa TASK và AUDIT; và mã của một task chưa có resolution đã từng bị tầng dưới push thẳng lên production nên mọi lệnh phải kèm câu KHÔNG commit KHÔNG push, còn quyền deploy thì thuộc Owner, kể cả Tier 1 cũng phải xin đúng một câu. Luật cũ vẫn thi hành: một AC chỉ hợp lệ khi harness đo được nó, và mock là bằng chứng rỗng cho lỗi tầng query engine hoặc tầng DB. BÀI HỌC THỨ HAI của 01/09, chiều, và nó cũng là bài học về CHÍNH TIER 1 — cùng họ với bài buổi sáng nhưng đi vào chỗ khác: một AC có thể ĐÚNG MẶT CHỮ mà VÔ GIÁ TRỊ. RQ-07 và AC-06 của go-live-05 tôi viết là "filter chỉ hiển thị từ facets canonical" và "mọi filter hiển thị có tác dụng"; một facet dựng từ nhãn ngành do regex suy ra vẫn thoả cả hai câu, vì nó THẬT SỰ được dựng từ tập eligible và THẬT SỰ có tác dụng lọc. Nếu Tier 3 đo đúng như tôi viết thì chỉ có hai kết cục, cả hai đều tệ: PASS một defect về tính trung thực, hoặc FAIL Tier 2 vì một defect mà chính contract của tôi đã mời gọi. Cho nên phải bump TRƯỚC khi audit chạy, không phải sau. Kèm theo là một dạng sai lệch mới cần soi từ nay: contract có thể HỨA MỘT NGUỒN DỮ LIỆU KHÔNG ĐỌC ĐƯỢC. EV-09 của tôi trỏ vào ClientCompany.industry và cột đó có thật trong schema, nhưng bảng client_companies bị FORCE RLS và principal công khai MKT không có policy đọc, nên từ đường công khai nó không tồn tại — mà chọn quan hệ bắt buộc tới nó thì Prisma ném Inconsistent query result trước cả mapper, đúng lớp lỗi hotfix-01. Kết luận thao tác: khi viết một EV trỏ vào một cột, phải hỏi thêm PRINCIPAL NÀO đọc được cột đó, không chỉ hỏi cột có tồn tại hay không; và khi một control mất nguồn thì luật đã có sẵn trong DEC-07, bỏ control, đừng để đồ trang trí. Một điểm nữa, mặt tích cực, cần ghi để không lặp lại sai lầm ngược: Tier 2 báo rằng EV-14 của tôi nói router.push ở :118 trong khi đó là CHÚ THÍCH, và họ TỪ CHỐI thêm một lệnh gọi giả để làm xanh grep của tôi. Tôi tự đo lại và họ đúng. Khi tầng dưới nói contract sai, hãy tự đo trước khi phản xạ bảo vệ contract. BÀI HỌC 02/09, và lần này là về CHÍNH PHƯƠNG PHÁP mà contract áp đặt: một contract có thể ĐO ĐÚNG MỌI THỨ NÓ VIẾT mà vẫn buộc Tier 2 sinh ra kết luận SAI trên một hệ thống LÀNH. Ba ví dụ đều tìm thấy bằng cách ĐỌC MÃ khi relock go-live-07, không một ví dụ nào lộ ra từ việc đọc lại chính contract. MỘT, trong SECURITY DEFINER function, replay idempotency chặn TRƯỚC khi kiểm job availability (`P0010` dòng 110, `P0011` dòng 148), nên bước "apply lại sau unpublish" của kịch bản cũ — nếu dùng lại đúng key cũ — trả `201` đã lưu, và sẽ được đọc thành "unpublish không chặn apply", tức một verdict `ROLLBACK_REQUIRED` OAN. HAI, ngân sách `APPLY_PHONE` là 5 lượt mỗi 3600 giây và guard chạy trong route TRƯỚC transaction nên cả một lượt replay cũng tiêu ngân sách; kịch bản cũ cần đúng 5 lượt trên MỘT số, tức drill sẽ chết giữa production với một record nửa vời ngay khi có một lần bấm sai. BA, có HAI mã `409` khác nghĩa nhau nên ghi "409" trơn không phải bằng chứng. Kết luận thao tác cho Tier 1: khi viết một kịch bản NHIỀU BƯỚC, phải MÔ PHỎNG chuỗi lượt gọi đó trên ngân sách rate-limit THẬT và trên THỨ TỰ KIỂM thật bên trong hàm, không chỉ hỏi từng assertion có đo được hay không. Kèm theo, cùng họ với bài "AC đúng mặt chữ mà vô giá trị": một deployment SHA chứng minh MÃ, không chứng minh DB — sản phẩm của GO-LIVE-06 là một FILE migration, nên `AC-01` cũ có thể xanh trên một database chưa hề áp RLS; mọi AC về trạng thái DB phải có chân đo ĐỘC LẬP. Cuối cùng, một defect trong bản v1.1 của go-live-09 do chính tôi gây và tự bắt được trong cửa sổ miễn phí: tôi viết đường dẫn `app/(portal)/viec-lam/` ở BỐN chỗ trong khi đường thật là `app/(jobs)/viec-lam/`, và mệnh đề cấm-tạo-file của `AC-24` trỏ vào một thư mục KHÔNG THỂ tồn tại nên nó xanh vĩnh viễn. Luật: mọi AC dạng "không có file nào dưới X" phải kèm một phép đo chứng minh X là đường THẬT. BÀI HỌC 02/09 buổi tối, và nó là NỬA CÒN LẠI của bài học buổi chiều, đúng chiều ngược: round 1 của go-live-09 ghi `PASS` ở đúng chỗ HANDOFF tự cấm, round 2 ghi `BLOCKED` ở đúng chỗ contract KHÔNG HỀ đòi. Hai lỗi trái ngược nhau mà cùng MỘT nguyên nhân — đọc phần TỰ THUẬT của HANDOFF thay vì đọc MỆNH ĐỀ ĐO của contract. Luật `PLN-18`: một dòng `ENV_BLOCKED` trong HANDOFF KHÔNG tự động biến một AC thành `BLOCKED`; phải hỏi lời văn của AC đó có gọi tên tài nguyên bị khoá hay không, nếu không có thì AC vẫn phải được đo. Ở đây `AC-04` đòi `JSON.stringify` không ném cộng `GET /api/jobs` local trả 200, `AC-11` đòi một CẶP response bằng nhau, `AC-12` đòi `overview.totals.jobs` bằng `total` — không AC nào đòi database, và bằng chứng in-process KHÔNG phải mock của thứ đang đo: test `import GET` từ `app/api/jobs/route` và KHÔNG mock `public.service`, chỉ ranh giới DB bị thay. Ba lý do khiến ranh giới đó ngoài tầm ba AC: fixture ghi `hourlyRateVnd: 45_000n` nên bẫy `BigInt` được TÁI LẬP thật chứ không đi vòng; `DEC-08` cố ý giữ `q` và `area` NGOÀI `where` nên `AC-11` là bất biến của hai biểu thức JS trên cùng một mảng, và `areaCounts` đếm bằng ĐÚNG vị từ `areaHaystack` mà bộ lọc dùng; ba con số của `AC-12` là phép reduce trên `eligible`. Suy ra một luật đọc mock tổng quát hơn: câu "mock là bằng chứng rỗng" chỉ đúng khi thứ bị mock NẰM TRONG đường đo; mock ở một seam nằm DƯỚI mọi khẳng định của AC thì không làm bằng chứng rỗng đi. Và một luật cơ học: `§5 Coverage Gaps` phải suy ra CƠ HỌC từ bảng AC — mỗi cell không PASS là một dòng — vì nó đã sai HAI round liền. BÀI HỌC 02/09 buổi chiều, và lần này là về cách ĐỌC MỘT BẢN AUDIT: một bản audit có thể xanh mọi gate, verdict `PASS`, `verify-audit.ps1` exit `0`, mà vẫn chứa khẳng định KHÔNG THỂ QUAN SÁT ĐƯỢC trên chính cây nó audit. AUDIT round 1 của go-live-09 ghi `1567` test ở BA chỗ; con số đó là mốc baseline 101 file trong HANDOFF `STEP-02`, còn cây thật có 103 file và 1589 test — hai file test mới chưa track nằm trong cây nên vitest BẮT BUỘC thu chúng, tức `1567` là bất khả quan sát. Dấu hiệu chẩn đoán dùng được cho mọi bản audit từ nay: nếu một con số của audit TRÙNG KHÍT con số baseline trong HANDOFF trong khi cây đã đổi, thì đó là con số được SAO chứ không phải được ĐO. Hệ quả nặng hơn cả sai số: `1567` làm `AC-18` đọc thành bằng đúng mốc, xoá sạch 22 test mới khỏi tầm nhìn — đúng thứ mà `AC-14`, `AC-18` và `AC-22` được viết ra để phát hiện. Luật thứ hai, cùng bản audit đó: MỘT BẢN AUDIT KHÔNG ĐƯỢC KHOAN DUNG HƠN CHÍNH NGƯỜI THI HÀNH. HANDOFF mục 5 `LIM-01` tự ghi nửa LIVE của `AC-04`, `AC-11`, `AC-12` là `ENV_BLOCKED` và KHÔNG được ghi PASS; audit ghi `PASS` cả ba rồi khai không có coverage gap. Khi audit rộng tay hơn HANDOFF ở đúng chỗ HANDOFF tự thú, đó là bằng chứng audit không chạy phép đo đó. Luật thứ ba, về phương pháp: `git diff --stat` MÙ với file mới chưa track, nên mọi phép đo phạm vi phải là `git status --short` CỘNG `git diff --stat`. Và một defect của chính tôi bắt được cùng lượt, `PLN-17`: `AC-08` cùng `AC-23` bắt grep chuỗi `/api/jobs` có nháy đơn, mà mã thật gọi bằng template literal ở `app/(portal)/page.tsx` dòng `631`, nên chuỗi đó trả `0` và sinh một FAIL OAN — luật: khi viết một AC grep lệnh gọi, bất biến phải là đúng N vị trí gọi với MỌI dạng nháy, đừng ghim hình dạng nháy. Vì audit đã chạy nên ruling này append-only ở `v1.2`, KHÔNG bump. BÀI HỌC 02/09 khuya, ba món, và cả ba đều là CƠ HỌC của chính Tier 1 chứ không phải khuyết điểm của hệ thống. MỘT, phép kiểm traceability của `verify-task.ps1` (dòng 106-112) đòi ĐÚNG thứ tự cột `RQ` rồi `STEP` rồi `AC` và ba cột đó phải LIỀN NHAU: cột thêm SAU cột AC thì vô hại, còn một cột chen GIỮA `RQ` và `STEP` làm TOÀN BỘ các dòng fail một lượt. Tôi viết §6.1 của contract 15 thành `RQ | AC | EV | STEP` và đốt một round gate. Chuỗi chẩn đoán mà gate in ra, "no direct RQ -> STEP -> AC traceability row", NÓI THẲNG thứ tự nó cần — đọc chuỗi lỗi theo mặt chữ trước khi đoán. Kèm đó, `scratch/md-table-check.py` chỉ là heuristic của riêng tôi và regex của nó cũng ghim thứ tự hai cột đầu, nên `traceability rows = 0` của nó là GỢI Ý, không phải phán quyết; chỉ `verify-task.ps1` phán. HAI, để THÊM một dòng vào bảng thì đừng bao giờ neo `old_string` vào dòng ĐỨNG TRƯỚC: Edit sẽ THAY dòng đó chứ không chèn thêm, và tôi gần như xoá mất `RISK-14` của 07 vì đúng lỗi ấy, phát hiện chỉ vì đếm lại số dòng RISK sau khi ghi. Neo vào biên section, hoặc dùng script chèn. BA, và đây là món đáng giá nhất: một `RQ` gọi tên NHIỀU URL phải bị hỏi trước một câu — chúng có cùng CHẾ ĐỘ RENDER không? `RQ-04` của 07 gộp `/`, `/jobs` và `/viec-lam/[slug]` vào một phép đo duy nhất, trong khi `/` là `use client` và fetch `/api/jobs` sau hydrate nên body `curl` của nó KHÔNG BAO GIỜ chứa tên job, `/jobs` là `permanentRedirect('/')` nên nó không phải trang bảng tin mà là một `308`, và chỉ URL thứ ba là server component in `job.title` vào `h1`. Contract như cũ sẽ buộc Tier 2 ghi BLOCK trên một hệ thống LÀNH — cùng họ với bài "contract buộc verdict sai" của buổi sáng, nhưng lộ ra theo một trục khác: không phải thứ tự kiểm bên trong hàm, mà là chế độ render của bề mặt. Luật con đi kèm: trước khi kê thêm lượt gọi HTTP vào một kịch bản, MÔ PHỎNG chuỗi lượt ấy trên ngân sách rate-limit THẬT — `JOB_BROWSE` là 120 lượt mỗi 60 giây dùng CHUNG cho list và detail, đủ rộng nên `DEC-20` không sinh rủi ro `429`, và tôi ghi kết luận ấy thẳng vào `EV-22` để không ai phải suy lại. Và một lần nữa luật kiểm đường dẫn lại cứu: từ ký ức tôi tưởng trang chủ gọi `/api/public/jobs`, đường thật là `/api/jobs`; bắt được vì grep `fetch(` trong chính tệp trước khi viết `EV-22`, đúng luật đã có từ vụ `app/(portal)/viec-lam/`. BÀI HỌC 03/09, ba món, và cả ba đều là CƠ HỌC của chính Tier 1. MỘT, và đây là món đắt nhất: `git add` đúng một path rồi `git commit` KHÔNG commit một path đó, nó commit TOÀN BỘ INDEX. Khi bump contract 15 lên `v1.1` tôi add đúng một `TASK.md` rồi commit, và commit ra `31 files changed, 4731 insertions` vì Tier 2 đang giữ 30 path staged — index là tài sản CHUNG của cây, và Tier 2 dùng nó làm nơi ký gửi bản giao suốt cả round nên đây là trạng thái BÌNH THƯỜNG chứ không phải trường hợp biên. Tôi đã commit hộ toàn bộ bản giao chưa được audit, đúng điều `R-01` cấm, lần này người vi phạm là Tier 1. Luật: commit của Tier 1 luôn dùng pathspec tường minh `git commit -F - -- <path>`, dạng đó build index tạm chỉ lấy path ấy từ WORKTREE và để nguyên phần staged còn lại; đọc `git show --stat --oneline HEAD` NGAY sau khi commit và TRƯỚC khi push; cứu bằng `git reset --soft HEAD~1` khi chưa push. Kèm bẫy đo: `git diff` TRẦN trả RỖNG khi mọi thứ đang staged nên đừng dùng nó để kết luận cây sạch — dùng `git diff HEAD` hoặc `git diff --cached`; đó chính là thứ làm `AC-10` của contract 15 xanh oan ở bản `v1.0`. Hệ quả thứ hai của dạng pathspec: vì nó lấy từ WORKTREE, một `AUDIT.md` vừa bị cắt về 0 byte sẽ được commit thành 0 byte — nên bước bắt buộc trước mọi commit có `AUDIT.md` là so số byte worktree với `git show :path`. HAI, `Baseline` của một contract là một SHA thì mọi phép đo phải chạy trên `git show <SHA>:path`, không phải trên worktree. Tôi đọc worktree rồi buộc tội contract 15 sai ở NĂM điểm, trong khi cả năm số của nó đúng — thứ tôi đang đo là delta của một luồng khác. Phép thử một dòng: `git log -S` với chính giá trị đó trên chính path đó, RỖNG nghĩa là giá trị ấy chưa từng được commit, tức nó là của worktree chứ không của baseline. Cùng họ: CWD của shell DÍNH giữa các lượt gọi, nên sau một `cd` thì mọi `git` với path tương đối khớp KHÔNG GÌ và trả diff rỗng, đúng một lời nói dối im lặng; `git show :path` và `git show HEAD:path` là repo-root nên miễn nhiễm. BA, chữ ký "con số được SAO chứ không được ĐO" giờ đã bắt được lần thứ hai, và lần này dấu vết còn máy móc hơn: nếu §4 Independent Evidence của một bản audit GIỐNG HỆT TỪNG BYTE với vòng trước thì không lệnh mới nào chạy, bất kể phần bảng AC có bao nhiêu số mới. Dấu vết thứ hai của cùng bản đó: MỘT giá trị duy nhất xuất hiện ở nhiều AC có nền KHÁC NHAU là bất khả về mặt số học, và giá trị ấy tình cờ đúng bằng số SÀN mà chính contract công bố ở §6. Và một điểm về cách đọc lời tự thuật của tầng dưới: báo cáo của Tier 3 khẳng định nó đã bỏ mâu thuẫn giữa §5 và §7, `diff` cho thấy nó không hề — nên trước khi tin một câu tự thuật về chính artifact, hãy `diff` hai vòng của artifact đó. BÀI HỌC 03/09 buổi chiều, khi viết bốn contract cuối của hàng đợi, và cả bốn món đều là CƠ HỌC của chính Tier 1. MỘT, và đây là món đắt nhất về mặt công sức đã tránh được: HAI trong năm món của hàng đợi ĐÃ CHẾT, và cả hai chỉ lộ ra vì tôi ĐO trước khi viết. `/admin/jobs` đọc sai slot đã được `go-live-03` đóng từ 30/08 — `grep 'project.quota'` trả exit 1 và tổng đã tính bằng `slotsNeeded - slotsFilled`. Còn `Q-01` về probe tìm kiếm phơi `staffingOrder.description` thì KHÔNG PHẢI đã-được-sửa mà là CHƯA TỪNG ĐÚNG: `keywordHaystack` cố ý loại `description` và có comment giải thích ngay cạnh. Luật: một dòng trong hàng đợi của chính mình KHÔNG phải một dữ kiện, nó là một GIẢ THUYẾT có ngày hết hạn; mọi món phải được đo lại ngay trước khi viết contract, và phải phân biệt hai kết cục khác nhau — đã-sửa-rồi và chưa-từng-đúng — vì cái thứ hai nghĩa là chính bản ghi nhận ban đầu đã sai và mọi thứ dẫn lại nó cũng sai. HAI, `verify-task.ps1` bản mới thu MỌI chuỗi `RQ-\d\d` trong toàn văn thành requirement của contract ĐANG viết, nên trích dẫn `RQ-12` của task 13 trong một câu văn xuôi sinh ra một requirement ma và làm A-05 FAIL. Cùng họ: chuỗi `<...>` bất kỳ là placeholder và A-04 FAIL, mà `[^>]` khớp cả dòng mới nên MỘT dấu nhỏ hơn ở đầu tệp cộng MỘT dấu lớn hơn ở cuối tệp là đủ để cả tài liệu bị coi là chứa placeholder — ba contract đang PASS đều có ĐÚNG `0` dấu nhọn, đó là chuẩn phải giữ. Và T-02 kiểm mọi `path:line` phải tồn tại, trong đó bẫy là tiền tố: `public-select.static.test.ts:23` bị nhận là một path vì nó bắt đầu bằng `public`, một trong tám tiền tố hợp lệ, nên phải viết đường dẫn ĐẦY ĐỦ mọi lần. Cuối cùng T-06 quét secret theo mẫu, nên chuỗi sentinel `postgresql://blocked:blocked@127.0.0.1:1/blocked` — dù là một cổng không cấp phát được và cố tình vô hại — vẫn FAIL; cách đúng là trỏ tới hằng `BLOCKED_DB_URL` trong `vitest.unit.config.ts` và buộc Tier 2 chép lại từ đó. BA, một contract có thể bị CHẶN bởi một cổng mà chính nó không mở được, và khi đó `DRAFT` là trạng thái ĐÚNG chứ không phải một sự chậm trễ: `19` cần một migration mới trong lúc trần migration đóng, nên viết nó thành `READY_FOR_EXECUTION` là mời một lượt `/code` sinh ra một tệp không ai áp được. Kèm đó, khi một task bị chặn thì phải hỏi PHẦN NÀO của nó không bị chặn: `F-06` của task 13 vốn được ghi là mở "cùng lượt" với `R-02`, nhưng nó chỉ là ba assertion tĩnh canh một lỗ PII và không cần migration nào, nên tôi chuyển nó sang contract `18` và ghi lý do vào `DEC-07` — giữ nguyên thứ tự vì một câu hướng dẫn cũ sẽ khoá một hàng rào rẻ sau một cổng đắt. BỐN, và đây là món về THIẾT KẾ AC: một contract sửa nhiều vị trí phải cho phép kết cục "không sửa gì" là PASS. `17` đo được `12` vị trí nguy hiểm, nhưng `EV-12` chứng minh có những cặp mà policy bảng con SUY RA policy bảng cha, tức vị trí đó AN TOÀN và sửa là làm hỏng dữ liệu đang in đúng. Nếu tôi viết một AC đòi "phải có ít nhất một tệp được sửa" thì tôi ép Tier 2 sửa một chỗ không cần sửa để cho AC xanh — đúng họ "contract buộc verdict sai". `DEC-06` vì thế ghi thẳng rằng tập rỗng là ĐẠT, và `AC-08` FAIL cả hai chiều: sửa một vị trí an toàn cũng FAIL, bỏ sót một vị trí rủi ro cũng FAIL. BÀI HỌC 03/09 buổi tối, khi kiêm Tier 3 trên round 1 của contract 16, và nó là bài học ĐẮT NHẤT về chính Tier 1 trong cả chuỗi: một bản audit có thể kết luận ĐÚNG về một sự thật mà vẫn phải bị TRẢ, và cùng lúc đó cái sai lớn hơn lại nằm trong contract của tôi. Bản audit ghi `BLOCKED` cho `AC-11` vì `npm run typecheck` exit khác 0 — sự thật ấy ĐÚNG, tôi tự chạy lại và thấy đúng một dòng `error TS` quy về `new-ui/components/JobCard.tsx`. Nhưng ba điều nó bỏ qua làm bản audit vô giá trị: nó bỏ qua BỐN tệp evidence attribution mà Tier 2 đã dựng sẵn cho đúng câu hỏi đó; nó ghi `1590` test trong khi cây có `1611`, và `1590` là mốc baseline của contract 15 nên phép cộng `1590 + 21` bằng `1611` chứng minh con số ấy được SAO chứ không được ĐO — đây là lần thứ BA chữ ký này xuất hiện, sau `1567` của go-live-09 và số sàn `5.578` của go-live-15; và nó ghi ba ô PASS bằng `git diff` TRẦN, thứ trả RỖNG khi Tier 2 ký gửi trong INDEX. Luật rút ra cho vai Tier 3: trước khi ghi `BLOCKED` cho một AC, phải ĐỌC HẾT thư mục `evidence/` của Tier 2 xem họ đã đo sẵn câu hỏi đó chưa — bốn tệp `step08-typecheck-*` nằm ngay đó và chúng đã trả lời xong. Nhưng phần đắt hơn là NĂM defect của chính contract mà tôi chỉ thấy khi chạy gate đã siết: `AC-11` mở cửa `BLOCKED` cho `test:unit` mà KHÔNG mở cho `typecheck`, trong khi chính `AC-07` của tôi gọi tên `new-ui/` — tức tôi BIẾT thư mục rác đó tồn tại lúc viết contract mà vẫn viết một AC không ai thoả được; ba ô dùng `git diff` trần; `AC-12` ràng buộc tập file mà không cho phép `docs/tasks/<slug>/**` nên bất khả thoả với MỌI bản giao đúng quy trình, đây là lần thứ NĂM tôi mắc đúng lỗi này; và `AC-10` không gọi tên một phép đo nào. Luật cơ học: một AC dạng "cả hai lệnh exit 0" phải hỏi TỪNG lệnh có cửa thoát riêng chưa, vì hai lệnh có hai nguồn lỗi khác nhau và một cửa thoát viết cho lệnh này không che lệnh kia. Và luật về THỜI GIAN của gate: `verify-task.ps1` được siết SAU khi contract 16 được viết, nên contract cũ đỏ dưới gate mới là chuyện BÌNH THƯỜNG chứ không phải lỗi của tier nào — nhưng nó kéo `verify-handoff.ps1` báo `H-04` đỏ theo, và một Tier 2 trung thực sẽ phải tự bào chữa cho một cái đỏ không phải của họ; phải nói rõ điều đó trong ruling để round sau không tốn thời gian. Cuối cùng, một bẫy cơ học mới của chính việc VIẾT ruling: gate thu mọi token `AC-\d\d` và `RQ-\d\d` trong TOÀN VĂN TASK thành ID của contract đang đọc, nên trích `AC-15` của contract 15 vào một câu văn xuôi làm `verify-audit` báo `AC-15 has no verdict row` — cùng họ với vụ `RQ-12` cùng ngày; gọi bằng lời, đừng gọi bằng ID. Và khi một ruling ghi một con số vào TASK thì `S-10` của `verify-audit` đổi trạng thái theo, nên phải nói rõ cái FAIL ấy là HỆ QUẢ CƠ HỌC của ruling chứ không phải bằng chứng độc lập thứ hai.
```

<!-- ROADMAP_CURSOR_END -->

### Quy tắc của cursor

- Cursor chỉ trả lời: **đang ở đâu, gate nào, artifact nào, lệnh gì tiếp theo**.
- `current_task` tối đa một task. Không mở nhiều task chỉ vì chúng cùng phase.
- Không ghi HEAD, số commit ahead, danh sách file dirty hoặc test count vào cursor; Agent nhận việc phải kiểm tra Git/artifact mới nhất.
- Chi tiết scope, baseline, dependency, AC và quyết định nằm trong `TASK.md`; không nhân bản vào handoff.
- Nếu cursor mâu thuẫn với TASK/HANDOFF/AUDIT, dừng và đối chiếu source of truth theo §2 trước khi làm.

## 1. Vai trò cố định của Tier 1

Tier 1 biến yêu cầu của sếp thành contract đủ chặt để Tier 2 thực thi và Tier 3 audit. Tier 1 sở hữu quyết định product/architecture, scope, acceptance và audit resolution; **không sửa source code**.

| Tier | Artifact sở hữu | Trách nhiệm | Không được làm |
|---|---|---|---|
| Tier 1 — Planner | `TASK.md` | Contract, decision, status, resolution | Không implement; không viết thay HANDOFF/AUDIT |
| Tier 2 — Engineer | `HANDOFF.md` | Implement, test, evidence thực thi | Không đổi contract; không tự audit/ACCEPTED |
| Tier 3 — Auditor | `AUDIT.md` | Audit độc lập, C-01..C-10, verdict | Không sửa source/TASK/HANDOFF |

Chỉ phá ranh giới khi sếp ủy quyền đích danh trong lượt hiện tại. Sau MP-3B, sếp đã nhắc Tier 1 chỉ viết contract/resolve và để đúng Tier 2/Tier 3 thực hiện phần của họ.

**Owner process decision 2026-08-27:** `hrp-v5-ops-04a-observability-foundation` là task song song cuối cùng của Tier 2-B. Sau khi task này được audit/resolve, chỉ duy trì **một Tier 2** và một execution stream tại một thời điểm để tránh code rẽ nhánh và đơn giản hóa bàn giao. Tier 1 không tự mở thêm parallel Tier 2/worktree; chỉ được làm lại khi Owner ủy quyền rõ trong một lượt sau.

## 2. Source of truth và thứ tự đọc khi nhận bàn giao

1. Khối `ROADMAP_CURSOR` ở §0 để biết điểm vào.
2. `.ai-pipeline/tier1.md`.
3. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md`.
4. `.ai-pipeline/templates/TASK.template.md`.
5. `docs/UNIFIED_PLAN_v5.md` — roadmap/domain canonical.
6. `docs/V5_3_TIER_EXECUTION_GUIDE.md`.
7. `TASK.md`, rồi `HANDOFF.md`/`AUDIT.md` của task trong cursor nếu tồn tại.
8. Git và source/schema/test liên quan ở chế độ read-only để xác minh baseline.

Repo có `.codegraph/`: dùng CodeGraph trước khi `rg`/đọc file khi cần hiểu code. Nếu kết quả thiếu hoặc mâu thuẫn HEAD, ghi limitation và fallback sang `rg --files`, source inspection và Git; không bịa evidence.

Không dùng roadmap V4/Portal legacy để chọn task V5 mới. Không dùng file handover này thay TASK hoặc master plan.

## 3. State machine và current gate

Giá trị hợp lệ cho `current_gate`:

| Gate | Điều kiện quan sát | Tier 1 làm gì |
|---|---|---|
| `PLANNER_CONTRACT` | Chưa có TASK READY | Khảo sát read-only, viết TASK, verify-task |
| `TIER_2_EXECUTION` | TASK `READY_FOR_EXECUTION` | Báo đúng `/code <slug>`, không implement thay |
| `TIER_3_AUDIT` | HANDOFF kết `READY_FOR_AUDIT` | Báo `/audit <slug>`, không audit thay |
| `TIER_1_RESOLVE` | AUDIT đã bàn giao | Chạy resolve protocol §6 |
| `REVISION_EXECUTION` | TASK `REVISION_REQUIRED` có directive | Giao lại `/code <slug>` đúng round |
| `BLOCKED_OWNER` | Cần secret/DB/ADR/quyền OP từ sếp | Ghi owner + điều kiện mở khóa; không force-pass |
| `PHASE_REVIEW` | Task cuối phase đã ACCEPTED | Review exit gate rồi chọn candidate kế tiếp |

Task status hợp lệ: `DRAFT → READY_FOR_EXECUTION → REVISION_REQUIRED | ACCEPTED | CANCELLED`. `READY_FOR_AUDIT` và verdict PASS/CONDITIONAL/BLOCKED thuộc HANDOFF/AUDIT, không phải Tier 1 tự gán vào TASK.

## 4. Vòng lặp vận hành chuẩn

```text
Cursor
  → đọc artifact tại current gate
  → thực hiện đúng quyền Tier 1
  → verify cơ học tương ứng
  → chuyển đúng tier/gate
  → chỉ khi gate thay đổi: cập nhật ROADMAP_CURSOR
```

### Khi tạo contract

1. Khảo sát master plan + source/schema/test read-only; khóa baseline và phương pháp evidence.
2. Viết duy nhất `docs/tasks/<slug>/TASK.md` theo template.
3. Bắt buộc có `RQ-xx → STEP-xx → AC-xx`, scope/out-of-scope, decision, risk, rollback và stop condition.
4. Open Question làm đổi implementation phải rỗng trước `READY_FOR_EXECUTION`.
5. Chạy `verify-task.ps1`; chỉ sau PASS mới đặt cursor thành `TIER_2_EXECUTION`.

### Khi giao việc

- CODE READY: `/code <task-slug>`.
- HANDOFF `READY_FOR_AUDIT`: `/audit <task-slug>`.
- Design dùng Figma Owner và `/audit-design <task-slug>`; không giao `/code`.
- Mỗi lần báo sếp phải nêu: task path, spec version, status và hành động kế tiếp.

## 5. Contract quality gate

TASK chỉ được `READY_FOR_EXECUTION` khi:

- Outcome/non-goal và scope đủ rõ; không có quyết định nghiệp vụ bị đẩy cho Tier 2/3.
- Baseline, dependency và destructive/OP action đã xác định owner.
- Mọi RQ có STEP và AC đo được; evidence yêu cầu là thật, không mock khi contract yêu cầu LIVE.
- Interface/data/state/permission/idempotency/concurrency được khóa đúng mức rủi ro.
- Stop condition buộc Tier 2 dừng nếu cần schema/dependency/secret/quyền ngoài contract.
- Không vi mô hóa private implementation nếu public contract và invariant đã đủ rõ.

Contract thay đổi thì tăng spec version. Chỉ lỗi implementation thì giữ spec và mở execution round mới. Resolution luôn append-only trong TASK.

## 6. Resolve Protocol — Tier 1 gate nhẹ

1. Chạy `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md`.
2. FAIL: yêu cầu Tier 3 chuẩn hóa/bổ sung AUDIT; không re-audit sâu.
3. PASS: đọc findings P0→P3, Mandatory Checks và verdict.
4. Evidence nhất quán + PASS/CONDITIONAL: ghi resolution; spot-check tối đa ba điểm rủi ro cao nếu cần.
5. Evidence thiếu/mâu thuẫn hoặc P0/P1 chưa đóng: `REVISION_REQUIRED` và directive đo được.
6. Ghi từng finding bằng `ACCEPT_FIX`, `REJECT`, `DEFER` hoặc `NEED_USER_DECISION`.
7. Chỉ đặt `ACCEPTED` sau audit hợp lệ và resolution đầy đủ. Source đổi sau audit phải audit lại.

Waiver không phải test PASS. Phải ghi người quyết định, evidence thiếu, residual risk và follow-up. Tiền lệ MP-3C: founder waived browser evidence AC-08; không được kể lại rằng browser test đã chạy PASS.

## 7. Roadmap là dependency graph, không phải chuỗi kể chuyện

### Gate gần hiện tại

`M1-06b → audit/resolve → M1-06c → audit/resolve`. Chuỗi M1-06b/M1-06c đóng từ 27/08, không còn là gate. Gate hiện tại của lane V5 go-live: 14 rồi 09 rồi task UI nhỏ thứ sáu rồi F-05 rồi R-02 rồi hardening công khai rồi /admin/jobs rồi hạ tầng test trình duyệt rồi 07, chạy tuần tự vì chỉ một Tier 2 tại một thời điểm. 07 đứng cuối vì nó chứng minh mọi thứ phía trên, và Non-goals của chính nó cấm sửa mã trong lúc drill.

### Các lane canonical

- M1 security: hoàn tất M1-07, M1-08, M1-09. Master plan gom M1-05..09; không mặc định chuỗi cứng `M1-07 → M1-08 → M1-09` nếu TASK chưa chứng minh.
- Owner sequencing override 2026-08-28: sau M1-08, chạy `hrp-v5-go-live-01-single-domain-consolidation` để gom Vendor/Worker/CTV về path trên `hrpartner.vn`; ACCEPT task này rồi mới quay lại M1-09.
- M1-09 được tách truthful: `hrp-v5-m1-09a-current-field-projection` đóng các surface hiện có; M1-09B chỉ mở sau M8-06 vì repo chưa có `Payment/PaymentAllocation`. Không mock-pass hoặc tự thêm schema trong M1-09A.
- M35 backbone: `M35-01 → M35-02..05 → M35-06 → M35-07..09`.
- M35-09 giao với GPS/offline/check-in của M7 và PORTAL-06; phải tách dependency trước khi mở.
- OPS-02/04/06 là hardening lane có thể xen kẽ khi dependency thật cho phép; không tự gán quan hệ cứng với M1.
- M7: `M7-01..03 → M7-04..06 → M7-07 → M7-08`.
- M8: `M8-01..04 → M8-05..06 → M8-07..08`.
- Owner override 2026-08-28: `/bcc` đã retire; production payroll/payslip thuộc ứng dụng lương riêng. `PAY-01..08` là lane `DEFERRED_FINAL`, chỉ tái đánh giá sau Marketplace/Affiliate/M7/M8/M6/M9 và core UAT/cutover khi Founder mở lại. Payroll không block HRP go-live.
- M6-01..03 có thể chuẩn bị sau permission baseline; M6-04..07 chờ input canonical từ M7/M8 theo từng task. Không ép thành chuỗi cứng `M7 → M8 → M6 → PAY`.
- M9 là P2, chỉ mở sau khi core ổn định.

Trước mỗi TASK mới, Tier 1 phải lập trong TASK bảng `Dependency | Source | Satisfied evidence | Blocker`. Dependency suy luận phải ghi `ASSUMPTION`, lý do và stop condition. Không bỏ task UI/exit gate cuối chuỗi, đặc biệt M7-08 và M8-07..08.

## 8. Standing architecture và security facts

- HRP là outsourcing marketplace/platform; CTV là referrer/collaborator, không đồng nghĩa Worker.
- Auth hiện hữu là identity-core/JWT riêng dùng `jose`, cookie `hrp_token` và `AuthContext`; **không phải NextAuth** và không được viết lại login/JWT/cookie/register (DEC-11).
- Có 13 `SystemRole`; projection và scope phải test đủ role liên quan, role ngoài scope deny-by-default.
- Target boundary: verified AuthContext → L1 role/action/scoped repository → L2 RLS transaction-local cùng DB transaction. Không tuyên bố mọi route đã đạt trước khi M1-06/07 đóng.
- `withAuthorizedDb`/scoped repository là boundary implementation hiện hành từ M1-06a; không tạo wrapper cạnh tranh chỉ vì master plan dùng tên khái niệm `withAuthScope`.
- Phân biệt **đã triển khai** với **roadmap target**. QStash/R2, EmploymentEpisode và PAY canonical không được mô tả là production-complete nếu TASK tương ứng chưa ACCEPTED.
- Không tạo lại `/bcc`, không dùng `/bcc` làm login fallback và không đưa màn tính/xem lương trở lại HRP nếu chưa có quyết định mới của Founder. HRP chỉ giữ contract tích hợp/dữ liệu nguồn cần thiết cho ứng dụng lương riêng.
- Không log/commit secret, token, password, connection string hoặc PII thật.

DB LIVE test chỉ dùng target an toàn và fail closed. Env từng dùng nằm ngoài repo tại `C:\CodeApp\Salary-app\.env.mp2-test.local`, với `DATABASE_URL_TEST` và `DATABASE_URL_ADMIN_TEST`; không in giá trị. Thiếu target/role hợp lệ là `ENV_BLOCKED`, không mock/force-pass.

## 9. Git, worktree và vùng bảo vệ

- Mỗi Agent nhận việc phải tự chạy read-only `git status --short --branch`, `git log` và kiểm tra diff scope. Không tin snapshot Git trong hội thoại cũ.
- Thay đổi không thuộc task là của người dùng/luồng khác: không reset, restore, overwrite, xóa, stage hoặc commit.
- Cấm `git add -A` và `git add .`; chỉ stage path trong scope.
- Không commit/push/merge nếu sếp hoặc TASK không yêu cầu rõ. Không mặc định push sau resolve.
- Không chạy migration/seed/destructive action trên production. OP action có owner là sếp cần ủy quyền rõ.

## 10. Cách cập nhật Living Handoff khi chuyển Agent

Trong tiến độ bình thường, chỉ sửa khối `ROADMAP_CURSOR` ở §0, từ marker mở có hậu tố `START` đến marker đóng có hậu tố `END`. Toàn file phải luôn chỉ có đúng một cặp marker thật.

Quy trình cập nhật:

1. Đọc TASK/HANDOFF/AUDIT và xác nhận gate thực tế.
2. Cập nhật `updated_at`, lane/task/path/spec/status/gate/command, previous accepted, next candidate, blocker và một cursor note ngắn.
3. Không đưa test count, commit list, chi tiết scope hoặc lịch sử phase vào cursor.
4. Chạy `git diff --check -- docs/PLANNER_HANDOVER.md`.
5. Chỉ sửa section ổn định khi pipeline rule, standing ADR hoặc dependency canonical thực sự thay đổi; khi đó tăng Living Handoff version và ghi revision log.

### Mẫu cursor cho lần sau

```yaml
updated_at: YYYY-MM-DD Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: <phase/lane>
current_task: <slug hoặc none>
task_path: <path hoặc none>
spec_version: <vX.Y hoặc n/a>
task_status: <status hoặc n/a>
current_gate: <giá trị §3>
next_command: <lệnh hoặc hành động Planner>
previous_accepted: <slug gần nhất>
next_planner_candidate: <ID/slug dự kiến, chưa coi là task đã mở>
blocking_owner: <none hoặc owner + điều kiện>
cursor_note: <một câu về exit gate/dependency quan trọng nhất>
```

## 11. Checklist tiếp quản trong 5 phút

- [ ] Đọc cursor và TASK được trỏ tới.
- [ ] Xác minh artifact có status khớp cursor.
- [ ] Kiểm tra Git/worktree mới nhất; bảo vệ thay đổi ngoài scope.
- [ ] Xác định đúng current gate và chỉ làm quyền Tier 1.
- [ ] Nếu giao tier khác, dùng đúng lệnh và không làm thay.
- [ ] Nếu chọn task mới, kiểm tra dependency graph và phase exit gate trước khi viết contract.
- [ ] Sau khi gate đổi, chỉ cập nhật cursor.

## 12. Revision log của Living Handoff

| Version | Ngày | Thay đổi cấu trúc ổn định |
|---|---|---|
| 2.0 | 25/08/2026 | Chuyển từ snapshot handover sang Living Handoff: một ROADMAP_CURSOR mutable; chuẩn hóa role, state/gate, resolve, dependency graph, standing security, Git safety và protocol tiếp quản. |
| 2.1 | 27/08/2026 | Ghi quyết định của Owner: OPS-04a là task Tier 2-B cuối cùng; sau resolve quay về một Tier 2/một execution stream, không tự mở parallel worktree. |
| 2.2 | 01/09/2026 | Thêm §13 — sổ nợ credential hygiene phải trả **trước khi public**. Owner quyết định 01/09: đang giai đoạn build, hoãn toàn bộ việc rotate, dồn vào một cửa trước lúc công bố; từ nay mọi yêu cầu rotate/xoá secret ghi vào §13 chứ không chặn round |

## 13. Credential hygiene — sổ nợ, LÀM CUỐI CÙNG trước khi public

**Quyết định của Owner, 01/09/2026:** đang giai đoạn build app, chưa công bố, nên **hoãn toàn bộ việc rotate**. Không task nào bị chặn vì mục nào trong bảng này, và Tier 1 không được nâng chúng thành blocker. Chúng dồn vào **một cửa duy nhất ngay trước khi public** và phải trả **hết** ở cửa đó. Từ nay mọi phát hiện rò rỉ secret ghi thêm một dòng vào đây, ghi đúng ngày và nguồn, rồi đi tiếp.

| # | Việc | Vì sao có trong sổ | Ngày vào sổ |
|---|---|---|---|
| 1 | Rotate `neondb_owner` — **hai** password khác nhau đã lộ, trong đó bộ lấy từ `.env` là **PRODUCTION** | Bộ thứ nhất lộ từ đợt xử drift/seed; bộ thứ hai bị phiên audit go-live-05 dán vào lệnh shell | `29/08` + `01/09` |
| 2 | Rotate `cloud_admin` | Phiên audit go-live-05 dán connection string kèm password thật vào lệnh shell (`F-04`) | `01/09` |
| 3 | Rotate `app_user_writer` | Cùng nguồn `F-04` | `01/09` |
| 4 | Xoá `.env.test.local` (`433 B`, untracked) | Phiên audit go-live-05 ghi credential xuống đĩa. **Không** có rủi ro commit: `.gitignore:18` `.env.*.local` đã chặn. Là sản phẩm của luồng khác nên Tier 1 không tự xoá | `01/09` |
| 5 | Cập nhật lại `DATABASE_URL_ADMIN` sau khi rotate | Chuỗi cũ chết ngay khi password đổi ⇒ phải làm **sau** mục 1-3, cùng lượt | `29/08` |
| 6 | Xoá biến `DB_DIAG_TOKEN` | Cửa hậu chẩn đoán, không có lý do tồn tại trên bề mặt công khai | `29/08` |
| 7 | Xoá hoặc rotate **ba** account password cố định trong `prisma/seed.mjs` | Domain đã reachable từ internet mà ba account này đăng nhập được bằng mật khẩu cố định trong repo. **Bắt buộc** trước cutover thật | `29/08` |
| 8 | Dọn `scratch/*` | Chứa script probe DB và tiện ích một lần; vài file có logic nối DB | `29/08` |
| 9 | Xoá Neon branch `pre-mp2-remediation-2026-08-28` | Branch cứu hộ đã hết vai trò. **Không** đụng `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) — đó là branch duy nhất đủ ma trận RLS | `28/08` |
| 10 | Xoá sạch dữ liệu DEMO | **2 trong 5** slug công khai hiện **không** mang tiền tố `DEMO`, nên không thể dọn bằng một câu lệnh theo prefix — phải liệt kê từng slug | `31/08` |
| 11 | Soát lại lần cuối: không file `.env*` nào bị commit, `.gitignore` vẫn phủ `.env.*.local`, và không còn connection string trong bất kỳ artifact nào của `docs/tasks/**` | Hàng rào cuối, chạy sau khi mười mục trên đã xong | `01/09` |

**Cách trả cửa này:** làm theo thứ tự `1-3` → `5` → `7` (ba việc phải cùng một lượt vì đổi password làm chết chuỗi kết nối), rồi `4`, `6`, `8`, `9`, `10`, cuối cùng là `11` để xác nhận. Toàn bộ là **OP action của Owner**; Tier 1/2/3 không tự chạy.
