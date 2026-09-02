# TIER 1 LIVING HANDOFF v2.1 — HRP V5

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-02 23:30 Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: V5 go-live truth-and-surface. Hàng đợi Tier 2 TUẦN TỰ, một slot một lúc theo quyết định 27/08. Chuỗi go-live giờ có HAI contract đã viết và đã gate PASS: `hrp-v5-go-live-15-public-contrast-aa` ở `v1.0` GIAO ĐƯỢC NGAY, và 07 launch proof ở `v1.5` nằm CUỐI chuỗi. Thứ tự BẮT BUỘC là 15 trước 07, vì 07 chứng nhận đúng những bề mặt mà 15 sửa; điều kiện này ghi trong ô `Next gate` của chính contract 15. Trước 07 còn SÁU contract phải viết: quét `F-05` quan hệ bắt buộc dưới RLS, `R-02` che PII trong RPC, `/admin/jobs` đọc sai slot, hardening công khai gộp hai món, hạ tầng test trình duyệt, và contract tương phản THỨ HAI cho khoảng 41 chỗ nằm ngoài bề mặt công khai. Cổng cuối vẫn là mục 13 credential hygiene, đứng sát lúc công bố.
current_task: Tier 1 vừa LAND hai artifact contract và không có slot Tier 2 nào đang mở. MỘT, `docs/tasks/hrp-v5-go-live-15-public-contrast-aa/TASK.md` `v1.0` `READY_FOR_EXECUTION` ở commit `a5ff853`, neo `397b026`, 15 RQ cộng 15 AC cộng 21 EV cộng 9 DEC cộng 8 STEP cộng 10 RISK, `verify-task.ps1` PASS exit 0. Contract này sửa một lỗi tiếp cận đang in cho khách vô danh trên production: nút chính ở trạng thái nghỉ là chữ trắng trên `#f26522` chỉ đạt `3.153:1` trên ngưỡng `4.5:1`, cách sửa đã đo là nền `#a63b00` cho `6.468:1`, và mọi chữ cam trên nền sáng chuyển sang `#a63b00` với sàn `5.578:1` trên nền `#efeeec`. Phạm vi do Owner cắt là bề mặt công khai cộng `GlobalNavbar`, đúng 8 tệp, và `app/(portal)/page.tsx` NẰM NGOÀI phạm vi có chủ ý: năm nút chính của trang chủ nhận bản sửa qua lớp dùng chung `.hrp-btn-primary`, nên một tệp hơn nghìn dòng bị nhiều test ghim mặt chữ được sửa mà không mở ra. HAI, contract 07 lên `v1.5` ở commit `7043c68`: thêm `EV-22`, `DEC-20`, `RISK-16` và viết lại `RQ-04`, `AC-04`, `STEP-03`. Lý do bump là `RQ-04` cũ đòi anonymous thấy đúng job drill trên `/` và `/jobs` mà KHÔNG nói đo bằng gì, trong khi ba URL ấy KHÔNG cùng chế độ render, nên contract như cũ sẽ buộc Tier 2 ghi một BLOCK OAN trên một hệ thống lành.
task_path: docs/tasks/hrp-v5-go-live-15-public-contrast-aa/TASK.md
spec_version: 15 = `v1.0` READY_FOR_EXECUTION, chưa từng giao, cả hai round bằng `0` nên cửa sổ bump còn MỞ. 07 = `v1.5` (neo `3a95c29`, gate PASS; bump BA lần ngày 02/09 — `v1.3` ghi `EV-21` và `RISK-15`, `v1.4` rút lại một cảnh báo sai của chính `v1.3`, `v1.5` gán phương pháp đo cho từng URL của `RQ-04`; cửa sổ bump còn MỞ vì `Current audit round` bằng `0` và thư mục chỉ có `TASK.md`). 09 = `v1.2` ACCEPTED 02/09, đóng hẳn. 14 đóng ở `v1.1`. Luật cửa sổ bump đã chứng minh hai lần: sau khi một bản audit đã chạy thì TUYỆT ĐỐI không bump, vì `verify-audit` so spec giữa TASK và AUDIT nên bump sẽ làm gate FAIL oan và đốt một round — defect contract tìm thấy sau audit ghi thành ruling append-only ở đúng version cũ, như `PLN-17` và `PLN-18`.
task_status: hrp-v5-go-live-15-public-contrast-aa = `READY_FOR_EXECUTION` trên `v1.0`, execution round `0`, audit round `0`, GIAO ĐƯỢC NGAY và không có cửa chặn nào phía trước. hrp-v5-go-live-07-marketplace-launch-proof = `READY_FOR_EXECUTION` trên `v1.5`, giao được nhưng PHẢI ĐỢI 15 land và deploy xong, vì 07 đo bề mặt LIVE nên một lần deploy giữa drill sẽ đổi thứ đang được đo. Đọc `RQ-01` của 07 cho đúng: nó đòi deployment SHA CHỨA các commit ACCEPTED của 04/06/05 cộng hai hotfix, chứ không ghim một SHA duy nhất — nên push và deploy TRƯỚC drill là vô hại, cấm là deploy TRONG drill. Chân DB của `DEC-17` ĐÃ ĐÓNG bằng `EV-21`. hrp-v5-go-live-09-public-board-architecture = ACCEPTED trên `v1.2` ngày 02/09, mã đã lên production ở `bb8a983`, đóng hẳn. hrp-v5-go-live-14-industry-label-truth = ACCEPTED, đóng hẳn. Không có slot Tier 2 nào đang mở.
current_gate: TIER_2_EXECUTION
next_command: Giao NGAY `/code hrp-v5-go-live-15-public-contrast-aa` cho Tier 2, kèm `R-01` nguyên văn KHÔNG commit KHÔNG push KHÔNG deploy, cộng luật chống cắt file, cộng ba cảnh báo lấy từ §7 của chính contract. MỘT, lane test canonical là `npm run test:unit`; `npx vitest run` trần đọc `DATABASE_URL` từ `.env` là PRODUCTION và fail oan 24 test component, nên bằng chứng chạy bằng lane trần sẽ bị loại (`RQ-13`, `RISK-07`). HAI, `Avatar` ở `GlobalNavbar.tsx:26-36` KHÔNG được nhận lớp `.hrp-btn-primary`, vì test `public-ui-premium.static.test.ts:617-627` ghim cặp `hrp-btn-primary` cộng `nav-item-lift` và sẽ đỏ (`RISK-03`). BA, `RQ-10` cấm đổi giá trị bất kỳ token nào trong khối `@theme`: một dòng token đổi giá trị là BLOCK toàn task kể cả khi mọi số đo khác đạt, vì khoảng 41 chỗ ngoài phạm vi cũng đọc token ấy và không test nào bắt được (`RISK-01`). Sau khi 15 ACCEPTED và deploy xong thì mới mở drill 07, và trong lúc drill chạy thì KHÔNG deploy. Việc Tier 1 làm song song, không cho Owner trả lời gì: viết contract kế tiếp trong hàng đợi sáu món.
audit_lane_parallel: ĐÓNG HẲN. hrp-v5-go-live-10-admin-ui-repair ACCEPTED cả round 1 và round 2 trên spec v1.0, KHÔNG bump lần nào, mã đã deploy 1af4eff và xác nhận SỐNG. Audit round 2: Tier 1 tự chạy verify-audit ra Verdict PASS exit 0 trên file 9089 byte, TASK.md byte-identical với HEAD nên Tier 3 không ghi vào ô Planner, rev-list bằng 0 nên Tier 3 không commit không push, và AUDIT.md đã commit 5d11c49 TRƯỚC khi viết resolution theo R-02. Sáu phép đo SC-10..SC-15 của Tier 1 đều khớp AUDIT, mạnh nhất là SC-11 và SC-12 trên bundle production: trước deploy d3f6d0d25f5c04fc.css 69242 byte có 0 lượt alias, sau deploy 71260eaaf56163fe.css 70265 byte có 27 lượt alias sống cộng transform none important và nav-item-lift, còn chuỗi comment trong bundle bằng 0 vì minifier bóc sạch comment — nên alias có mặt trong bundle là bằng chứng máy rằng nó là CSS SỐNG. Bốn finding F-08..F-11 đều ACCEPT_FIX: F-08 là Tier 3 vẫn đo R2-01 R2-02 bằng cách đọc nguồn thô, chấp nhận được chỉ vì phép bóc comment giờ nằm trong chính bộ test và Tier 3 đã thấy nó RED rồi GREEN; F-09 là AC-16 trích đúng con số của HANDOFF và thiếu exit code; F-10 là §7 ghi round 1 là FAIL và ghi Tier 2 tạo round 2, cả hai đều SAI vì round 1 verdict là PASS đã được ACCEPTED và round 2 do Tier 1 mở — khác biệt đó là giữa hàng rào bắt được lỗi và hàng rào bỏ lọt lỗi, sự thật là bỏ lọt; F-11 là tính độc lập chỉ một phần vì Owner chỉ định phiên Tier 1 kiêm vai Tier 2, ghi thẳng để sau này không ai dẫn round này ra làm bằng chứng ba tầng vẫn tách
previous_accepted: hrp-v5-go-live-09-public-board-architecture — ACCEPTED 02/09 trên spec `v1.2` sau HAI round audit, không bump lần nào, mã lên production ở `bb8a983`. Ruling `PLN-18`..`PLN-22` append-only ở `v1.2`. Cần nhớ giới hạn của nó: lane integration CHƯA TỪNG chạy trong cả hai round vì không có `DATABASE_URL_TEST`, nên 09 không bảo đảm gì về RLS hay về hình dạng dòng THẬT của Prisma cho bề mặt công khai — đó là dư nợ của lane quét `F-05`, KHÔNG phải điều kiện của ba AC. Trước đó hrp-v5-go-live-14-industry-label-truth ACCEPTED 02/09 push `8ca2ee1`, đã xoá chip ngành nghề bịa khỏi trang chi tiết. Trước đó hrp-v5-go-live-11-public-rpc-residual-grant ACCEPTED trên `v1.2`, toàn bộ `AC-01`..`AC-11` PASS, đã push `fb993a7`, và số đo grant thật nằm trong TASK.md của nó: `total=1`, `residual_self_grant=0`, `inheritable=0`, `safe_admin=1`. Trước đó go-live-10 admin UI repair, go-live-12 public job detail, go-live-13 tracking PII mask, go-live-05 card truth (`e0c14ca`), go-live-08 UI premium ở `v1.3` — tất cả ACCEPTED và đóng hẳn.
next_planner_candidate: HÀNG ĐỢI CONTRACT, cập nhật 02/09 sau khi contract 15 được viết. ĐÃ ĐÓNG và không còn trong hàng đợi: go-live-05, go-live-08, go-live-09, go-live-10, go-live-11, go-live-12, go-live-13, go-live-14. ĐÃ VIẾT và đang chờ slot: 15 (tương phản AA bề mặt công khai, `v1.0`, giao trước) rồi 07 (launch proof, `v1.5`, cuối chuỗi). SÁU contract CHƯA VIẾT, theo thứ tự đề xuất: (1) contract tương phản THỨ HAI cho phần mà Owner đã cắt khỏi 15 — khoảng 41 chỗ trượt ngưỡng ở tám trang admin cộng `ctv`, `vendor`, `worker`, gồm hàng sidebar active để trắng trên `--color-primary` chỉ `3.153:1`, pill ở `app/bod/page.tsx` tụt `3.00:1` xuống `2.05:1` (P2 vì nó ĐÃ fail AA từ trước), một `hover:opacity-90` còn sót ở `app/vendor/page.tsx`, cộng các hex viết cứng `#94a3b8` `2.312:1` và `#64748b` `4.291:1` và `#dc2626` `4.355:1`; cộng 12 chỗ `outline-none` hoãn ở `Q-04` của 15. Ba icon thiếu `aria-hidden` trong `GlobalNavbar.tsx` thì ĐÃ nằm trong 15 ở `RQ-08`, đừng viết lại. (2) `F-05` của hotfix-02: quét mọi service khác đang select quan hệ KHÔNG nullable trên bảng bị RLS che. (3) `R-02` và `F-06` của task 13: che PII ngay trong `hrp_public_tracking_profile` bằng migration forward-only cộng assertion phủ định. (4) `/admin/jobs` đọc sai slot — ĐO LẠI trước khi viết, vì bốn task đã sửa vùng admin kể từ lúc ghi nhận. (5) Hardening bề mặt công khai gộp hai món: rate limit cho đường `/viec-lam/[slug]` (`DEC-12` và `RISK-03` của task 12) cộng `Q-01` về probe tìm kiếm phơi `staffingOrder.description`. (6) Hạ tầng test trình duyệt — món này còn có giá trị thứ hai là làm được `DEC-20` của 07 cho URL `/`. Cộng một món nhỏ không phải blocker: nhánh 404 của tracking đang thiếu `no-store`, residual finding `DEC-18` của go-live-07. Lane affiliate mở SAU go-live: trả lời các default §4.2 của `docs/aff_plan.md` rồi viết `aff-01` vào thư mục `docs/tasks/hrp-v5-aff-01-affiliate-code-issuing/` đang rỗng.
blocking_owner: BA điểm, không điểm nào chặn contract 15. Điểm cũ về chân DB của `DEC-17` đã ĐÓNG bằng `EV-21`, và điểm truy vấn trạng thái grant đã RÚT vì go-live-11 đã đo trực tiếp bằng `pg_auth_members` — Owner không phải chạy gì ở cả hai. (1) Chỉ một Tier 2 tại một thời điểm theo quyết định 27/08 nên cả hàng đợi phải chạy tuần tự. (2) Chưa tìm ra thứ gì cắt `AUDIT.md` về 0 byte: cơ chế thì đã biết — một buffer editor rỗng được extension lưu đè qua workspace-edit API — nhưng CHƯA biết extension nào. Việc trước mắt của Owner là đóng mọi tab `AUDIT.md` trong CẢ VS Code và Cursor, tắt `openai.chatgpt` cùng `google.google-antigravity` cho workspace này làm phép thử quyết định, và ngừng mở repo trong hai editor cùng lúc. Lần thứ tám luật `git add` NGAY đã chặn được và thiệt hại bằng không. (3) Các bước OP còn lại không có slot Tier 2 nên chạy song song được: `R-07` task 13 tra một mã tra cứu thật; dọn DEMO cho hai trong năm slug công khai còn thiếu prefix cộng dọn `DRILL-MKT` sau drill 07; smoke admin `R-03`; chữ ký §11 của runbook launch. Mục 13 credential hygiene là CỔNG CUỐI, đứng ngay trước lúc công bố, và theo quyết định Owner thì nó KHÔNG chặn bất kỳ task nào.
product_override: /bcc retired; production payroll/payslip belongs to the separate salary app; PAY-01..08 = DEFERRED_FINAL and does not block HRP go-live
cursor_note: Bài học lớn nhất của 01/09, và nó là bài học về CHÍNH TIER 1: một phép đo có thể THẬT, con số ĐÚNG, mà kết luận SAI. Tôi đếm được đúng 22 dòng var(--color- trong khoảng dòng 113 tới 136 của app/globals.css và ghi nó thành SC-02 làm bằng chứng ACCEPTED — nhưng cả 22 dòng đó nằm bên trong một comment CSS, nên chúng sinh ZERO byte trong bundle và bản deploy 474f3dc là no-op. Câu hỏi sàng lọc phải hỏi từ nay: nếu thứ này bị comment out, hoặc bị mock, hoặc không bao giờ được gọi, thì phép đo của tôi có ĐỔI không? Nếu không đổi thì phép đo đó rỗng. Với CSS và asset thì chỉ có hai dạng bằng chứng hợp lệ: bóc comment rồi mới đếm trên nguồn, hoặc đếm trên artifact ĐÃ BIÊN DỊCH trong .next/static/css hoặc trên bundle live, vì minifier bóc hết comment nên chuỗi có mặt trong bundle là bằng chứng nó sống. Cùng họ với hai bài học cũ: tsc không phải hàng rào khi đổi khoá DTO, và mock là bằng chứng rỗng cho lỗi tầng query engine. Thứ DUY NHẤT tố giác lần này là chênh lệch git diff --stat, 60 insertions thay vì 101, thấy được vì tôi đo lại scope ngay trước lúc push dù task đã ACCEPTED và mọi gate đã xanh — nên đừng bao giờ bỏ qua lệch số dòng. Ba bài học cũ vẫn thi hành: AUDIT.md có thể tồn tại thật rồi bị cắt về 0 byte một phút sau nên resolution phải đứng trên phép đo do chính Tier 1 chạy và bước 0 là đọc SỐ BYTE, và commit AUDIT.md ngay khi đọc xong vì file untracked bị cắt là mất hẳn; sửa sai sót của audit SAU khi audit đã chạy thì KHÔNG bump spec vì verify-audit so spec giữa TASK và AUDIT; và mã của một task chưa có resolution đã từng bị tầng dưới push thẳng lên production nên mọi lệnh phải kèm câu KHÔNG commit KHÔNG push, còn quyền deploy thì thuộc Owner, kể cả Tier 1 cũng phải xin đúng một câu. Luật cũ vẫn thi hành: một AC chỉ hợp lệ khi harness đo được nó, và mock là bằng chứng rỗng cho lỗi tầng query engine hoặc tầng DB. BÀI HỌC THỨ HAI của 01/09, chiều, và nó cũng là bài học về CHÍNH TIER 1 — cùng họ với bài buổi sáng nhưng đi vào chỗ khác: một AC có thể ĐÚNG MẶT CHỮ mà VÔ GIÁ TRỊ. RQ-07 và AC-06 của go-live-05 tôi viết là "filter chỉ hiển thị từ facets canonical" và "mọi filter hiển thị có tác dụng"; một facet dựng từ nhãn ngành do regex suy ra vẫn thoả cả hai câu, vì nó THẬT SỰ được dựng từ tập eligible và THẬT SỰ có tác dụng lọc. Nếu Tier 3 đo đúng như tôi viết thì chỉ có hai kết cục, cả hai đều tệ: PASS một defect về tính trung thực, hoặc FAIL Tier 2 vì một defect mà chính contract của tôi đã mời gọi. Cho nên phải bump TRƯỚC khi audit chạy, không phải sau. Kèm theo là một dạng sai lệch mới cần soi từ nay: contract có thể HỨA MỘT NGUỒN DỮ LIỆU KHÔNG ĐỌC ĐƯỢC. EV-09 của tôi trỏ vào ClientCompany.industry và cột đó có thật trong schema, nhưng bảng client_companies bị FORCE RLS và principal công khai MKT không có policy đọc, nên từ đường công khai nó không tồn tại — mà chọn quan hệ bắt buộc tới nó thì Prisma ném Inconsistent query result trước cả mapper, đúng lớp lỗi hotfix-01. Kết luận thao tác: khi viết một EV trỏ vào một cột, phải hỏi thêm PRINCIPAL NÀO đọc được cột đó, không chỉ hỏi cột có tồn tại hay không; và khi một control mất nguồn thì luật đã có sẵn trong DEC-07, bỏ control, đừng để đồ trang trí. Một điểm nữa, mặt tích cực, cần ghi để không lặp lại sai lầm ngược: Tier 2 báo rằng EV-14 của tôi nói router.push ở :118 trong khi đó là CHÚ THÍCH, và họ TỪ CHỐI thêm một lệnh gọi giả để làm xanh grep của tôi. Tôi tự đo lại và họ đúng. Khi tầng dưới nói contract sai, hãy tự đo trước khi phản xạ bảo vệ contract. BÀI HỌC 02/09, và lần này là về CHÍNH PHƯƠNG PHÁP mà contract áp đặt: một contract có thể ĐO ĐÚNG MỌI THỨ NÓ VIẾT mà vẫn buộc Tier 2 sinh ra kết luận SAI trên một hệ thống LÀNH. Ba ví dụ đều tìm thấy bằng cách ĐỌC MÃ khi relock go-live-07, không một ví dụ nào lộ ra từ việc đọc lại chính contract. MỘT, trong SECURITY DEFINER function, replay idempotency chặn TRƯỚC khi kiểm job availability (`P0010` dòng 110, `P0011` dòng 148), nên bước "apply lại sau unpublish" của kịch bản cũ — nếu dùng lại đúng key cũ — trả `201` đã lưu, và sẽ được đọc thành "unpublish không chặn apply", tức một verdict `ROLLBACK_REQUIRED` OAN. HAI, ngân sách `APPLY_PHONE` là 5 lượt mỗi 3600 giây và guard chạy trong route TRƯỚC transaction nên cả một lượt replay cũng tiêu ngân sách; kịch bản cũ cần đúng 5 lượt trên MỘT số, tức drill sẽ chết giữa production với một record nửa vời ngay khi có một lần bấm sai. BA, có HAI mã `409` khác nghĩa nhau nên ghi "409" trơn không phải bằng chứng. Kết luận thao tác cho Tier 1: khi viết một kịch bản NHIỀU BƯỚC, phải MÔ PHỎNG chuỗi lượt gọi đó trên ngân sách rate-limit THẬT và trên THỨ TỰ KIỂM thật bên trong hàm, không chỉ hỏi từng assertion có đo được hay không. Kèm theo, cùng họ với bài "AC đúng mặt chữ mà vô giá trị": một deployment SHA chứng minh MÃ, không chứng minh DB — sản phẩm của GO-LIVE-06 là một FILE migration, nên `AC-01` cũ có thể xanh trên một database chưa hề áp RLS; mọi AC về trạng thái DB phải có chân đo ĐỘC LẬP. Cuối cùng, một defect trong bản v1.1 của go-live-09 do chính tôi gây và tự bắt được trong cửa sổ miễn phí: tôi viết đường dẫn `app/(portal)/viec-lam/` ở BỐN chỗ trong khi đường thật là `app/(jobs)/viec-lam/`, và mệnh đề cấm-tạo-file của `AC-24` trỏ vào một thư mục KHÔNG THỂ tồn tại nên nó xanh vĩnh viễn. Luật: mọi AC dạng "không có file nào dưới X" phải kèm một phép đo chứng minh X là đường THẬT. BÀI HỌC 02/09 buổi tối, và nó là NỬA CÒN LẠI của bài học buổi chiều, đúng chiều ngược: round 1 của go-live-09 ghi `PASS` ở đúng chỗ HANDOFF tự cấm, round 2 ghi `BLOCKED` ở đúng chỗ contract KHÔNG HỀ đòi. Hai lỗi trái ngược nhau mà cùng MỘT nguyên nhân — đọc phần TỰ THUẬT của HANDOFF thay vì đọc MỆNH ĐỀ ĐO của contract. Luật `PLN-18`: một dòng `ENV_BLOCKED` trong HANDOFF KHÔNG tự động biến một AC thành `BLOCKED`; phải hỏi lời văn của AC đó có gọi tên tài nguyên bị khoá hay không, nếu không có thì AC vẫn phải được đo. Ở đây `AC-04` đòi `JSON.stringify` không ném cộng `GET /api/jobs` local trả 200, `AC-11` đòi một CẶP response bằng nhau, `AC-12` đòi `overview.totals.jobs` bằng `total` — không AC nào đòi database, và bằng chứng in-process KHÔNG phải mock của thứ đang đo: test `import GET` từ `app/api/jobs/route` và KHÔNG mock `public.service`, chỉ ranh giới DB bị thay. Ba lý do khiến ranh giới đó ngoài tầm ba AC: fixture ghi `hourlyRateVnd: 45_000n` nên bẫy `BigInt` được TÁI LẬP thật chứ không đi vòng; `DEC-08` cố ý giữ `q` và `area` NGOÀI `where` nên `AC-11` là bất biến của hai biểu thức JS trên cùng một mảng, và `areaCounts` đếm bằng ĐÚNG vị từ `areaHaystack` mà bộ lọc dùng; ba con số của `AC-12` là phép reduce trên `eligible`. Suy ra một luật đọc mock tổng quát hơn: câu "mock là bằng chứng rỗng" chỉ đúng khi thứ bị mock NẰM TRONG đường đo; mock ở một seam nằm DƯỚI mọi khẳng định của AC thì không làm bằng chứng rỗng đi. Và một luật cơ học: `§5 Coverage Gaps` phải suy ra CƠ HỌC từ bảng AC — mỗi cell không PASS là một dòng — vì nó đã sai HAI round liền. BÀI HỌC 02/09 buổi chiều, và lần này là về cách ĐỌC MỘT BẢN AUDIT: một bản audit có thể xanh mọi gate, verdict `PASS`, `verify-audit.ps1` exit `0`, mà vẫn chứa khẳng định KHÔNG THỂ QUAN SÁT ĐƯỢC trên chính cây nó audit. AUDIT round 1 của go-live-09 ghi `1567` test ở BA chỗ; con số đó là mốc baseline 101 file trong HANDOFF `STEP-02`, còn cây thật có 103 file và 1589 test — hai file test mới chưa track nằm trong cây nên vitest BẮT BUỘC thu chúng, tức `1567` là bất khả quan sát. Dấu hiệu chẩn đoán dùng được cho mọi bản audit từ nay: nếu một con số của audit TRÙNG KHÍT con số baseline trong HANDOFF trong khi cây đã đổi, thì đó là con số được SAO chứ không phải được ĐO. Hệ quả nặng hơn cả sai số: `1567` làm `AC-18` đọc thành bằng đúng mốc, xoá sạch 22 test mới khỏi tầm nhìn — đúng thứ mà `AC-14`, `AC-18` và `AC-22` được viết ra để phát hiện. Luật thứ hai, cùng bản audit đó: MỘT BẢN AUDIT KHÔNG ĐƯỢC KHOAN DUNG HƠN CHÍNH NGƯỜI THI HÀNH. HANDOFF mục 5 `LIM-01` tự ghi nửa LIVE của `AC-04`, `AC-11`, `AC-12` là `ENV_BLOCKED` và KHÔNG được ghi PASS; audit ghi `PASS` cả ba rồi khai không có coverage gap. Khi audit rộng tay hơn HANDOFF ở đúng chỗ HANDOFF tự thú, đó là bằng chứng audit không chạy phép đo đó. Luật thứ ba, về phương pháp: `git diff --stat` MÙ với file mới chưa track, nên mọi phép đo phạm vi phải là `git status --short` CỘNG `git diff --stat`. Và một defect của chính tôi bắt được cùng lượt, `PLN-17`: `AC-08` cùng `AC-23` bắt grep chuỗi `/api/jobs` có nháy đơn, mà mã thật gọi bằng template literal ở `app/(portal)/page.tsx` dòng `631`, nên chuỗi đó trả `0` và sinh một FAIL OAN — luật: khi viết một AC grep lệnh gọi, bất biến phải là đúng N vị trí gọi với MỌI dạng nháy, đừng ghim hình dạng nháy. Vì audit đã chạy nên ruling này append-only ở `v1.2`, KHÔNG bump. BÀI HỌC 02/09 khuya, ba món, và cả ba đều là CƠ HỌC của chính Tier 1 chứ không phải khuyết điểm của hệ thống. MỘT, phép kiểm traceability của `verify-task.ps1` (dòng 106-112) đòi ĐÚNG thứ tự cột `RQ` rồi `STEP` rồi `AC` và ba cột đó phải LIỀN NHAU: cột thêm SAU cột AC thì vô hại, còn một cột chen GIỮA `RQ` và `STEP` làm TOÀN BỘ các dòng fail một lượt. Tôi viết §6.1 của contract 15 thành `RQ | AC | EV | STEP` và đốt một round gate. Chuỗi chẩn đoán mà gate in ra, "no direct RQ -> STEP -> AC traceability row", NÓI THẲNG thứ tự nó cần — đọc chuỗi lỗi theo mặt chữ trước khi đoán. Kèm đó, `scratch/md-table-check.py` chỉ là heuristic của riêng tôi và regex của nó cũng ghim thứ tự hai cột đầu, nên `traceability rows = 0` của nó là GỢI Ý, không phải phán quyết; chỉ `verify-task.ps1` phán. HAI, để THÊM một dòng vào bảng thì đừng bao giờ neo `old_string` vào dòng ĐỨNG TRƯỚC: Edit sẽ THAY dòng đó chứ không chèn thêm, và tôi gần như xoá mất `RISK-14` của 07 vì đúng lỗi ấy, phát hiện chỉ vì đếm lại số dòng RISK sau khi ghi. Neo vào biên section, hoặc dùng script chèn. BA, và đây là món đáng giá nhất: một `RQ` gọi tên NHIỀU URL phải bị hỏi trước một câu — chúng có cùng CHẾ ĐỘ RENDER không? `RQ-04` của 07 gộp `/`, `/jobs` và `/viec-lam/[slug]` vào một phép đo duy nhất, trong khi `/` là `use client` và fetch `/api/jobs` sau hydrate nên body `curl` của nó KHÔNG BAO GIỜ chứa tên job, `/jobs` là `permanentRedirect('/')` nên nó không phải trang bảng tin mà là một `308`, và chỉ URL thứ ba là server component in `job.title` vào `h1`. Contract như cũ sẽ buộc Tier 2 ghi BLOCK trên một hệ thống LÀNH — cùng họ với bài "contract buộc verdict sai" của buổi sáng, nhưng lộ ra theo một trục khác: không phải thứ tự kiểm bên trong hàm, mà là chế độ render của bề mặt. Luật con đi kèm: trước khi kê thêm lượt gọi HTTP vào một kịch bản, MÔ PHỎNG chuỗi lượt ấy trên ngân sách rate-limit THẬT — `JOB_BROWSE` là 120 lượt mỗi 60 giây dùng CHUNG cho list và detail, đủ rộng nên `DEC-20` không sinh rủi ro `429`, và tôi ghi kết luận ấy thẳng vào `EV-22` để không ai phải suy lại. Và một lần nữa luật kiểm đường dẫn lại cứu: từ ký ức tôi tưởng trang chủ gọi `/api/public/jobs`, đường thật là `/api/jobs`; bắt được vì grep `fetch(` trong chính tệp trước khi viết `EV-22`, đúng luật đã có từ vụ `app/(portal)/viec-lam/`.
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
