# TIER 1 LIVING HANDOFF v2.1 — HRP V5

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-02 13:05 Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: V5 go-live truth-and-surface. Owner duyet ke hoach 02/09 bang "ok lam luon di". Hang doi Tier 2 TUAN TU, mot slot mot luc theo quyet dinh 27/08: 14 (nhan nganh nghe) roi 09 (kien truc bang tin) roi task UI nho thu sau roi quet F-05 quan he bat buoc duoi RLS roi R-02 che PII trong RPC roi hardening cong khai gop hai mon roi /admin/jobs doc sai slot roi ha tang test trinh duyet roi 07 launch proof cuoi cung. Cong 10 la muc 13 credential hygiene, dung mot cong sat luc cong bo.
current_task: hrp-v5-go-live-14-industry-label-truth — MA DA GIAO, HANDOFF ket READY_FOR_AUDIT (65167 byte, chua track). Tier 1 tu do lai chin file va bon cong: typecheck exit 0, test:unit exit 0 voi 1567 passed (1567), build exit 0 voi 29/29 static page, grep job.industry trong app = 0, grep industry: trong service = 0, git diff ba file admin = 0 dong, va so ca test cua bay file test truoc/sau deu la 103 nen khong assertion nao bi xoa trang. Chat luong ma DAT. Nhung AUDIT.md KHONG TON TAI tren dia: round audit 1 khong de lai artifact nao.
task_path: docs/tasks/hrp-v5-go-live-14-industry-label-truth/TASK.md
spec_version: v1.1 cho task 14 — bump 02/09 sau khi Tier 2 GREEN nhung TRUOC khi co audit nao, la cua so duy nhat bump duoc. Chi sua loi van AC-01 va AC-03 cong them DEC-11; khong doi RQ nao, khong doi 4.2, khong them viec ma. Gate lai: MALFORMED ROWS 0, DEC 11 lien tuc, verify-task.ps1 exit 0. go-live-09 va go-live-07 van chua bump.
task_status: hrp-v5-go-live-14-industry-label-truth = READY_FOR_EXECUTION tren giay (status chi doi sang ACCEPTED sau resolution), thuc te ma da xong va dang cho audit that. CHUA RESOLVE DUOC vi khong co AUDIT.md de doc. Tier 3 bao PASS bang loi van nhung log lenh cua chinh ho khong co lenh ghi file nao va khong co lan chay verify-audit.ps1 nao — day dung la bay ma memory hrp-resolve-requires-real-audit canh bao.
current_gate: TIER_3_AUDIT
next_command: /audit hrp-v5-go-live-14-industry-label-truth tren spec v1.1 — kem dung cau KHONG commit, KHONG push, KHONG deploy (R-01) va yeu cau BAT BUOC: ghi ra docs/tasks/hrp-v5-go-live-14-industry-label-truth/AUDIT.md, roi tu chay verify-audit.ps1 voi CA HAI tham so -TaskPath va -AuditPath, roi dan lai duong dan cong so byte cong exit code. Round 1 truoc do bi HUY vi khong de lai artifact. Sau khi 14 ACCEPTED thi Tier 1 relock go-live-09 (dang neo d4928af, nhac 05 dung 0 lan, ba muc dung nhan nganh nghe lam truc noi dung — 14 vua xoa dung field do) roi relock go-live-07 (dang neo 6680011).
audit_lane_parallel: ĐÓNG HẲN. hrp-v5-go-live-10-admin-ui-repair ACCEPTED cả round 1 và round 2 trên spec v1.0, KHÔNG bump lần nào, mã đã deploy 1af4eff và xác nhận SỐNG. Audit round 2: Tier 1 tự chạy verify-audit ra Verdict PASS exit 0 trên file 9089 byte, TASK.md byte-identical với HEAD nên Tier 3 không ghi vào ô Planner, rev-list bằng 0 nên Tier 3 không commit không push, và AUDIT.md đã commit 5d11c49 TRƯỚC khi viết resolution theo R-02. Sáu phép đo SC-10..SC-15 của Tier 1 đều khớp AUDIT, mạnh nhất là SC-11 và SC-12 trên bundle production: trước deploy d3f6d0d25f5c04fc.css 69242 byte có 0 lượt alias, sau deploy 71260eaaf56163fe.css 70265 byte có 27 lượt alias sống cộng transform none important và nav-item-lift, còn chuỗi comment trong bundle bằng 0 vì minifier bóc sạch comment — nên alias có mặt trong bundle là bằng chứng máy rằng nó là CSS SỐNG. Bốn finding F-08..F-11 đều ACCEPT_FIX: F-08 là Tier 3 vẫn đo R2-01 R2-02 bằng cách đọc nguồn thô, chấp nhận được chỉ vì phép bóc comment giờ nằm trong chính bộ test và Tier 3 đã thấy nó RED rồi GREEN; F-09 là AC-16 trích đúng con số của HANDOFF và thiếu exit code; F-10 là §7 ghi round 1 là FAIL và ghi Tier 2 tạo round 2, cả hai đều SAI vì round 1 verdict là PASS đã được ACCEPTED và round 2 do Tier 1 mở — khác biệt đó là giữa hàng rào bắt được lỗi và hàng rào bỏ lọt lỗi, sự thật là bỏ lọt; F-11 là tính độc lập chỉ một phần vì Owner chỉ định phiên Tier 1 kiêm vai Tier 2, ghi thẳng để sau này không ai dẫn round này ra làm bằng chứng ba tầng vẫn tách
previous_accepted: hrp-v5-go-live-11-public-rpc-residual-grant — ACCEPTED trên spec v1.2, toàn bộ AC-01..AC-11 PASS, và ĐÃ PUSH fb993a7 nên cổng PUSH_PENDING_OWNER đã đóng. Trước đó hrp-v5-go-live-10-admin-ui-repair — ACCEPTED 2026-09-01 trên audit round 1, spec v1.0, KHÔNG bump, và ĐÃ DEPLOY production tại 474f3dc theo lệnh trực tiếp của Owner; nhưng bản deploy hụt 41 dòng so với bản Tier 2 giao nên execution round 2 đang mở, xem F-07 và §11. Trước đó hrp-v5-go-live-12-public-job-detail-page — ACCEPTED 2026-08-31, audit round 1 PASS trên spec v1.1. Tier 1 tự chạy verify-audit.ps1 exit 0 rồi tự đo lại năm điểm trên production: cả năm slug công khai trả 200 còn slug bịa trả 404 và không một 500 nào, nên bẫy quan hệ bắt buộc dưới RLS của hotfix-01/02 KHÔNG tái diễn trên đường đọc mới; HTML live zero match bốn chuỗi nội bộ; backlink và nút ứng tuyển đều có mặt; npm run test:unit exit 0; lớp phủ card và các nút vẫn là sibling sau khi tách component. Sáu finding ACCEPT_FIX ở §9, trong đó F-01 là mã bị commit rồi push rồi deploy production TRƯỚC khi có resolution, trong khi AC-16 của chính contract cấm push. Trước đó hrp-v5-go-live-13-tracking-pii-mask cũng ACCEPTED cùng ngày, chứng minh che PII qua chunk JS đã deploy chứ không dùng mã tra cứu thật
next_planner_candidate: LANE TIER 2 KẾ TIẾP, không phải candidate mà là việc đã sẵn: sau khi go-live-10 round 2 xong thì giao /code hrp-v5-go-live-11-public-rpc-residual-grant round 2 trên spec v1.1 — điểm đổi so với v1.0: KHÔNG thu hồi mọi membership nữa, chỉ thu hồi đúng self-grant do member tự cấp bằng GRANTED BY, giữ record auto-admin do cloud_admin cấp vì đó là đường quản trị role và đường rollback; migration phải fail-closed theo hình dạng record chứ không đếm thô; phải dán inventory nguyên văn TRƯỚC và SAU khi áp, và nếu inventory trước không khớp PLN-01 thì đó là dữ kiện mới của contract, báo lại chứ không tự thu hồi. AUDIT.md round 1 của task đó là 0 byte và untracked nên mất hẳn, nhưng không chặn vì round 1 đã REVISION_REQUIRED. Rồi tới các contract đã gate PASS nhưng chưa giao: go-live-05 (card truth, baseline còn trỏ 6680011 nên phải khoá lại SHA), rồi go-live-08 — PHẢI bump lên v1.2 trước khi giao, vì task 10 tạo khối focus-visible và prefers-reduced-motion ở tầng global nên các AC đo trạng thái trước bằng 0 của 08 sẽ sai, và vì 12 thêm điều hướng trên card cộng ApplyModal đã tách nên 08 và 09 cần AC bảo toàn hai thứ đó. Rồi go-live-09 (quyết định 09 có hấp thụ 05 hay không), cuối cùng go-live-07 (launch proof, xếp sau 05). Năm task mới cần mở: quét mọi service khác đang select quan hệ bắt buộc trên bảng bị RLS che tức F-05 của hotfix-02; che PII ngay trong hrp_public_tracking_profile bằng migration forward-only cộng assertion phủ định tức R-02 và F-06 của task 13; /admin/jobs đọc sai slot; rate limit cho đường /viec-lam/{code} tức DEC-12 và RISK-03 của task 12; và Q-01 của task 12 về việc probe tìm kiếm phơi staffingOrder.description. Thêm một task nhỏ thứ sáu do go-live-10 bộc lộ, gom ba điểm ngoài allowlist của nó nên Tier 2 không được phép chạm: pill ở app/bod/page.tsx:129 tụt tương phản 3.00:1 xuống 2.05:1 trên chữ 12 px — lưu ý nó ĐÃ fail AA từ trước nên đây là fail thành fail nặng hơn, không phải pass thành fail, vì vậy P2 chứ không phải P0; hàng sidebar đang active để trắng trên --color-primary chỉ 3.15:1 nên cần đổi nền active hoặc đổi màu chữ chứ không phải đổi hành vi hover, vì RQ-08 chỉ đòi đổi nền khi hover cho mục KHÔNG active; và một hover:opacity-90 còn sót ở app/vendor/page.tsx:196. Task đó cũng nên gom luôn 12 chỗ outline-none có sẵn mà vòng focus mới giờ thắng, để quyết là xoá outline-none hay giữ. THÊM một task thứ bảy, mở ra từ EV-16 của go-live-05 và là task ĐANG CHẠY TRÊN PRODUCTION nên ưu tiên cao hơn năm task kia: trang chi tiết việc làm app/(jobs)/viec-lam/[slug]/page.tsx:137-138 in hai chip JOB_TYPE_LABELS[job.jobType] và job.industry, trong đó job.industry là nhãn do inferIndustry suy ra từ văn bản tự do chứ không phải dữ liệu thật, và hai chuỗi đó bị public-detail.static.test.ts:110-111 khoá lại nên test hiện hành đang HỢP THỨC HOÁ defect. inferIndustry có TRƯỚC baseline fb993a7 nên đây không phải hồi quy của bất kỳ round nào; nó đã deploy từ 691be38. Hai đường đóng, phải chọn dứt khoát: hoặc cấp cho ngành nghề một nguồn canonical mà principal MKT đọc được, tức một RLS policy mới trên client_companies — việc này cần migration cộng uỷ quyền của Owner cộng một quyết định có ý thức về việc mở rộng quyền đọc công khai sang một bảng khách hàng thương mại, và phải cân với RISK-01 rò rỉ Client identity; hoặc bỏ hẳn chip ngành nghề khỏi trang chi tiết và sửa test cho khớp. KHÔNG được để nguyên trạng, vì đây là một khẳng định sai in cho người dùng thật.
blocking_owner: Bốn điểm. (1) Stop condition migration ĐÃ BỊ VƯỢT và đã công bố: allowlist 31/08 gồm đúng hai migration, nhưng 20260831103000_marketplace_search_tracking_profile là cái thứ ba, đã commit và đã push; nó cũng để lại quyền tồn dư trong hrp_public_rpc vì re-grant WITH SET FALSE chứ không REVOKE. Contract go-live-11 đã viết để đóng đúng phần đó, nhưng bước áp phải do Owner dán trong Neon Console SQL Editor trên branch hrp-live vì harness chặn mọi lệnh nối DB production. (2) Chỉ một Tier 2 tại một thời điểm theo quyết định 27/08, nên các contract đã sẵn phải chạy tuần tự. (3) Không chặn dispatch nhưng cần Owner xử ở tầng hạ tầng: có thứ gì đó cắt AUDIT.md về 0 byte khoảng một phút sau khi file được ghi, đã xảy ra bốn lần trong ngày và lần thứ tư lúc 20:57:21 ngay giữa lúc Tier 1 đang làm việc trên file đó; hai trong ba file cứu được bằng git restore vì đã từng commit có nội dung, file thứ ba mất hẳn vì untracked; ghi thành F-07 mức P1 NEED_USER_DECISION ở task 13. (4) Hai bước OP giờ chạy được ngay vì mã đã lên production: §9.3 task 12 — bấm ba card khác nhau ở trang chủ và dán URL trước/sau mỗi lần bấm; và R-07 task 13 — tra một mã tra cứu thật rồi xác nhận màn hình che đúng còn thân response không chứa phone hay cccdNumber gốc. (5) ĐÃ ĐÓNG lúc 01/09 00:5x: Owner nói deploy đi, Tier 1 push 474f3dc nên bản sửa admin đã lên production; điều còn lại chỉ là bước mắt thường của Owner ở R-03, mở /admin/applications, /admin/jobs, /admin/staffing xác nhận panel đã đục, bảng đã có vạch kẻ, nút phát hành đã đọc được, và KHÔNG chụp giá trị SĐT hay CCCD thật vào bất kỳ artifact nào.
product_override: /bcc retired; production payroll/payslip belongs to the separate salary app; PAY-01..08 = DEFERRED_FINAL and does not block HRP go-live
cursor_note: Bài học lớn nhất của 01/09, và nó là bài học về CHÍNH TIER 1: một phép đo có thể THẬT, con số ĐÚNG, mà kết luận SAI. Tôi đếm được đúng 22 dòng var(--color- trong khoảng dòng 113 tới 136 của app/globals.css và ghi nó thành SC-02 làm bằng chứng ACCEPTED — nhưng cả 22 dòng đó nằm bên trong một comment CSS, nên chúng sinh ZERO byte trong bundle và bản deploy 474f3dc là no-op. Câu hỏi sàng lọc phải hỏi từ nay: nếu thứ này bị comment out, hoặc bị mock, hoặc không bao giờ được gọi, thì phép đo của tôi có ĐỔI không? Nếu không đổi thì phép đo đó rỗng. Với CSS và asset thì chỉ có hai dạng bằng chứng hợp lệ: bóc comment rồi mới đếm trên nguồn, hoặc đếm trên artifact ĐÃ BIÊN DỊCH trong .next/static/css hoặc trên bundle live, vì minifier bóc hết comment nên chuỗi có mặt trong bundle là bằng chứng nó sống. Cùng họ với hai bài học cũ: tsc không phải hàng rào khi đổi khoá DTO, và mock là bằng chứng rỗng cho lỗi tầng query engine. Thứ DUY NHẤT tố giác lần này là chênh lệch git diff --stat, 60 insertions thay vì 101, thấy được vì tôi đo lại scope ngay trước lúc push dù task đã ACCEPTED và mọi gate đã xanh — nên đừng bao giờ bỏ qua lệch số dòng. Ba bài học cũ vẫn thi hành: AUDIT.md có thể tồn tại thật rồi bị cắt về 0 byte một phút sau nên resolution phải đứng trên phép đo do chính Tier 1 chạy và bước 0 là đọc SỐ BYTE, và commit AUDIT.md ngay khi đọc xong vì file untracked bị cắt là mất hẳn; sửa sai sót của audit SAU khi audit đã chạy thì KHÔNG bump spec vì verify-audit so spec giữa TASK và AUDIT; và mã của một task chưa có resolution đã từng bị tầng dưới push thẳng lên production nên mọi lệnh phải kèm câu KHÔNG commit KHÔNG push, còn quyền deploy thì thuộc Owner, kể cả Tier 1 cũng phải xin đúng một câu. Luật cũ vẫn thi hành: một AC chỉ hợp lệ khi harness đo được nó, và mock là bằng chứng rỗng cho lỗi tầng query engine hoặc tầng DB. BÀI HỌC THỨ HAI của 01/09, chiều, và nó cũng là bài học về CHÍNH TIER 1 — cùng họ với bài buổi sáng nhưng đi vào chỗ khác: một AC có thể ĐÚNG MẶT CHỮ mà VÔ GIÁ TRỊ. RQ-07 và AC-06 của go-live-05 tôi viết là "filter chỉ hiển thị từ facets canonical" và "mọi filter hiển thị có tác dụng"; một facet dựng từ nhãn ngành do regex suy ra vẫn thoả cả hai câu, vì nó THẬT SỰ được dựng từ tập eligible và THẬT SỰ có tác dụng lọc. Nếu Tier 3 đo đúng như tôi viết thì chỉ có hai kết cục, cả hai đều tệ: PASS một defect về tính trung thực, hoặc FAIL Tier 2 vì một defect mà chính contract của tôi đã mời gọi. Cho nên phải bump TRƯỚC khi audit chạy, không phải sau. Kèm theo là một dạng sai lệch mới cần soi từ nay: contract có thể HỨA MỘT NGUỒN DỮ LIỆU KHÔNG ĐỌC ĐƯỢC. EV-09 của tôi trỏ vào ClientCompany.industry và cột đó có thật trong schema, nhưng bảng client_companies bị FORCE RLS và principal công khai MKT không có policy đọc, nên từ đường công khai nó không tồn tại — mà chọn quan hệ bắt buộc tới nó thì Prisma ném Inconsistent query result trước cả mapper, đúng lớp lỗi hotfix-01. Kết luận thao tác: khi viết một EV trỏ vào một cột, phải hỏi thêm PRINCIPAL NÀO đọc được cột đó, không chỉ hỏi cột có tồn tại hay không; và khi một control mất nguồn thì luật đã có sẵn trong DEC-07, bỏ control, đừng để đồ trang trí. Một điểm nữa, mặt tích cực, cần ghi để không lặp lại sai lầm ngược: Tier 2 báo rằng EV-14 của tôi nói router.push ở :118 trong khi đó là CHÚ THÍCH, và họ TỪ CHỐI thêm một lệnh gọi giả để làm xanh grep của tôi. Tôi tự đo lại và họ đúng. Khi tầng dưới nói contract sai, hãy tự đo trước khi phản xạ bảo vệ contract.
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
