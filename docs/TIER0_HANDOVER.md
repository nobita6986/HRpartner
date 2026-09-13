# HRP — TIER 0 PRODUCT AND ARCHITECTURE HANDOVER

> **Status:** ACTIVE TIER 0 AUTHORITY
> **Updated:** 2026-09-11
> **Scope:** phần còn lại của V6, V6 Native Foundation và toàn bộ đường vào V7
> **Audience:** Tier 0 mới và Tier 1 chịu trách nhiệm plan + implementation

---

## 1. Nhiệm vụ của Tier 0

Tier 0 là Owner kiến trúc và sản phẩm:

- giữ domain constitution và thứ tự phát triển xuyên V6 → V7;
- quyết định policy, phạm vi, dependency và trade-off có ảnh hưởng dài hạn;
- trả lời câu hỏi của Tier 1 và đánh giá các gate quan trọng;
- ngăn shortcut khiến V7 phải phá bỏ dữ liệu hoặc luồng V6;
- không viết TASK chi tiết, không code production và không điều phối từng bước thi công.

Tier 1 mới gộp Planner + Engineer: khảo sát, lập task, code, test, migration,
evidence, commit và push trong phạm vi đã khóa. Tier 1 được gọi sub-agent song song
khi chia được ownership rõ ràng. schema.prisma và migration authority chỉ có một
owner tại một thời điểm.

Tier 3 là audit nhẹ. Chỉ audit task có rủi ro domain, dữ liệu hoặc security cao.
UI thuần, copy, fixture, docs và thay đổi reversible mặc định không cần Tier 3.

---

## 2. Quyết định chiến lược không được đảo ngược

### 2.1 Không còn release V6+ riêng

Mọi compatibility work trước đây mang tên V6+ được nhúng vào phần còn lại của V6
với tên **V6 Native Foundation**. Tên file V6_PLUS_* và mã V6P-* được giữ để không
gãy tham chiếu; chúng không đại diện cho một release trung gian.

~~~text
V6 product completion
        +
V6 Native Foundation N0..N7
        ↓
V6 Native Compatibility Gate
        ↓
V7.1 → V7.10
~~~

V7 chỉ bắt đầu feature work sau gate. Không dùng đầu V7 để sửa domain authority,
backfill hoặc lifecycle còn dang dở từ V6.

### 2.2 Đây là hệ thống đang sống

Không schema override, drop/rename trực tiếp hoặc backfill bằng suy đoán. Mọi
chuyển authority phải đi theo chuỗi:

~~~text
ADD
→ AUDIT CURRENT DATA
→ ADOPT FOR NEW WRITES
→ BACKFILL WHEN TRUTHFUL
→ COMPATIBILITY READ
→ SWITCH AUTHORITY
→ ENFORCE
→ CLEANUP LATER
~~~

### 2.3 Domain constitution

~~~text
LaborProfile != Worker
CandidateSubmission/Application != Placement
JobProposal != Application
Placement != ProjectAssignment
PlacementCase != JobOpening
PlacementCase != EmploymentEpisode
ReferralAttribution != HandlingAssignment
HandlingAssignment != CommissionBeneficiaryDecision
JobOpening != JobPosting
ServiceModel != WorkClassification
Talent Repository != Company Pool
~~~

Không thêm scalar shortcut làm nguồn sự thật như isWorking, availability,
currentCompanyId, currentProjectId, handlerId, ownerId hoặc poolStatus. Giá trị
hiện tại phải được tính bằng selector/projection có thể rebuild từ lịch sử canonical.

---

## 3. Thứ tự thẩm quyền tài liệu

Khi tài liệu xung đột, áp dụng theo thứ tự:

1. docs/TIER0_HANDOVER.md — quyết sách và roadmap đang hoạt động.
2. docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md — domain constitution và V7 master map.
3. docs/V7/AI_CODING_GUARDRAILS.md.
4. docs/V7/V6_V7_CONFLICT_CHANGE_REGISTER.md.
5. docs/V6/V6_change.md — V6 Native directive sau khi được tích hợp vào main.
6. docs/V7/V7_ARCHITECTURE.md.
7. docs/V7/V6_PLUS_PLAN.md và V6_PLUS_IMPLEMENTATION_BACKLOG.md — tên legacy,
   nội dung thuộc V6 Native Foundation.
8. v6-admin-rebuild, aff_plan và TASK cũ chỉ còn hiệu lực ở phần không bị
   các nguồn trên supersede.

Không dùng PLANNER_HANDOVER.md làm authority kiến trúc. Đó là cursor vận hành
của Tier 1 và có thể chứa lịch sử hoặc trạng thái thay đổi nhanh.

---

## 4. Trạng thái dự án tại thời điểm bàn giao

### 4.1 Git và tài liệu

- main/origin/main tại lúc khảo sát: 0e866ca — footer UI04 r4.
- Bộ roadmap V7-native đã được chuẩn hóa ở nhánh fix-ci-prisma-validate-r1,
  chủ yếu tại 7825623, 302764d, af33610 và d4b535d; chưa có trên main.
- Tier 1 phải đưa riêng roadmap paths cần thiết về main bằng task docs nhỏ,
  review path-by-path; không cherry-pick mù commit chứa CI hoặc archive relocation.
- Cho đến khi đồng bộ xong, tài liệu này là authority cho quyết định V6+ nhúng
  vào V6 và lộ trình N0..N7.

### 4.2 Phần đã có

- V5 closeout và các gate nền tảng chính đã hoàn tất phần lớn.
- V6 Phase 1 đã có LaborProfile, LaborProfileIntake, EmploymentEpisode, liên kết
  nullable từ CandidateSubmission, tách JobOpening và JobPosting.
- Migration V6 Phase 1A đã được Owner ghi nhận áp dụng live.
- Public homepage UI04 đã có navbar/container, Best Jobs live, tab Tuyển gấp,
  job-card interaction, footer và các vòng tinh chỉnh gần nhất.
- Một số bounded context đã có permission, audit/outbox, RLS và idempotency;
  không giả định chúng đã bao phủ domain mới.

### 4.3 Phần chưa có canonical authority

- PlacementCase và Application case-aware.
- HandlingAssignment theo case, có lịch sử transfer/release.
- Placement độc lập và lifecycle đầy đủ.
- JobOpening.serviceModel và serviceModelSnapshot trên Placement.
- ProjectAssignment.placementId và actual-start bridge.
- create-or-match LaborProfile dùng thống nhất cho mọi intake path.
- selector hiện trạng, compatibility reads, backfill/reconciliation và authority switch.
- JobProposal, InteractionOutcome, NextAction và các capability V7.

### 4.4 CI không được nhầm với roadmap sản phẩm

PR #1 của nhánh fix-ci đã sửa đúng Prisma P1012: Prisma generate/validate và
typecheck PASS. Toàn PR chưa merge-ready vì lint quét archive trong scratch và
Integration fail-closed khi thiếu DATABASE_URL_TEST. Tier 1 phải tách ownership
hai blocker này. N0 read-only được chạy song song; migration N1 chờ nhánh tích
hợp ổn định.

---

## 5. Lộ trình nội bộ V6

### N0 — Contract và discovery read-only

**Mục tiêu:** đo hiện trạng trước khi thay đổi schema hoặc dữ liệu.

- inventory schema, API, intake path và migration đã chạy;
- audit duplicate/identity conflict, submission không có profile, direct Assignment,
  multiple active state và referral/handler/beneficiary coupling;
- phân loại dữ liệu EXACT_SAFE, POSSIBLE_DUPLICATE, UNRESOLVED;
- khóa command, selector, permission và migration contract cho N1..N6.

**Audit:** Tier 3 NONE; Tier 0 review kết luận domain.
**Có thể bắt đầu ngay:** có. Đây là next domain task.

### N1 — Identity và PlacementCase

**Mục tiêu:** mọi intent tuyển dụng mới đi qua LaborProfile canonical và active case.

- createOrMatchLaborProfile trả EXACT_MATCH, POSSIBLE_MATCH, NEW;
- possible match không auto-merge;
- LaborProfile 1 → N PlacementCase, tối đa một active case bằng invariant
  concurrency-safe;
- CandidateSubmission.placementCaseId nullable; không tạo model Application mới
  chỉ để đổi tên;
- General Interest có thể là case chưa có Application;
- new writes resolve/create active case, legacy rows được phép nullable.

**Audit:** Tier 3 LIGHT bắt buộc cho identity, migration và invariant.

### N2 — Handling và AFF authority

**Mục tiêu:** responsibility có lịch sử và AFF không phá referral attribution.

- PlacementCase 1 → N HandlingAssignment;
- tối đa một active handling/case; transfer/release đóng row cũ và tạo row mới;
- Company Pool là projection: active case không có active handling hợp lệ;
- ReferralAttribution độc lập, không bị đổi khi handling hết hạn;
- AFF handling bắt đầu từ PlacementCase.openedAt qua policy boundary;
- CommissionBeneficiaryDecision tách khỏi referral và handling.

**Dependency:** N1 + Owner chốt AFF clock policy.
**Audit:** Tier 3 LIGHT bắt buộc.

### N3 — ServiceModel và Placement

**Mục tiêu:** phân biệt loại dịch vụ và kết quả bố trí lao động.

| Service model | Management mode |
|---|---|
| STAFFING_SUPPLY | HRP_MANAGED |
| LABOR_LEASING | HRP_MANAGED |
| RECRUITMENT_SERVICE | CLIENT_MANAGED |
| REFERRAL_SERVICE | CLIENT_MANAGED |

- Authority ServiceModel nằm trên JobOpening.
- Legacy opening thiếu evidence dùng UNKNOWN/nullable; không gán default bừa.
- PlacementCase 1 → N Placement.
- Placement snapshot ServiceModel và có lifecycle SELECTED, CONFIRMED, EFFECTIVE,
  FAILED, CANCELLED.
- Failed/no-show giữ lịch sử và case được quay lại matching.
- Correction/void đi qua named command và audit.

**Audit:** Tier 3 LIGHT bắt buộc cho migration và lifecycle.

### N4 — Workforce actual-start bridge

**Mục tiêu:** chỉ actual start hợp lệ mới tạo trạng thái workforce.

Client-managed Placement EFFECTIVE không tạo Worker, Episode hoặc ProjectAssignment.

HRP-managed actual start phải atomic:

~~~text
verify actual-start evidence/effectiveAt
→ create/reuse exactly one Worker
→ create EmploymentEpisode khi cần
→ create ACTIVE PRIMARY ProjectAssignment
→ link Assignment to Placement
→ mark Placement EFFECTIVE
→ close case success
→ audit + outbox trong cùng transaction
~~~

No-show không tạo workforce giả. Rehire dùng Worker cũ và Episode mới. Continuous
transfer đổi Assignment trong cùng Episode. Tối đa một ACTIVE PRIMARY Assignment
được enforce concurrency-safe.

**Dependency:** N1 + N3.
**Audit:** Tier 3 LIGHT bắt buộc.

### N5 — Operational và security boundary

**Mục tiêu:** critical mutation đủ an toàn để thành authority.

Mỗi named command critical phải có command-specific permission, data scope,
transaction, idempotency, concurrency control, effectiveAt/recordedAt, actor,
source, reason, evidence, audit event, outbox và RLS/policy tương ứng.

UI không tự ráp current state bằng query rời. Selector tập trung phải tồn tại cho
active case, current handler, Company Pool, availability, relationship, placement
và workforce.

**Audit:** Tier 3 LIGHT bắt buộc cho permission/RLS và critical command.

### N6 — Backfill, compatibility reads và authority switch

**Mục tiêu:** chuyển hệ thống đang sống sang authority mới mà không bịa lịch sử.

- tooling dry-run, resumable và idempotent;
- báo scanned/created/skipped/unresolved/failed;
- chỉ backfill row có evidence đủ mạnh;
- không suy diễn một Submission bằng một Case;
- không tạo Placement từ Assignment nếu thiếu provenance;
- new writes chuyển theo từng vertical slice;
- compatibility read và reconciliation chạy trước switch;
- disable legacy writer sau khi parity đạt;
- destructive rename/drop để cleanup sau khi V7 path ổn định.

**Audit:** Tier 3 LIGHT bắt buộc và cần migration evidence.

### N7 — V6 Native Compatibility Gate

Gate PASS khi đồng thời đạt:

- identity/create-or-match, referral protection và one Worker/profile;
- case-aware Application, max one active case và General Interest;
- historical handling, AFF policy và Company Pool projection;
- independent Placement và đúng client-managed/HRP-managed semantics;
- actual-start/no-show/rehire/transfer/one-primary invariants;
- permissions, RLS, idempotency, concurrency, audit/outbox và selectors;
- backfill/reconciliation/permanent fixtures;
- unresolved data được báo rõ, không biến thành dữ liệu giả.

**Audit:** Tier 3 LIGHT bắt buộc. Tier 0 ký gate. Sau đó mới mở V7.1 cho bounded
context liên quan.

---

## 6. Các lane sản phẩm chạy song song trong V6

| Lane | Trạng thái/hướng đi | Dependency bắt buộc |
|---|---|---|
| UI04 public homepage | Visual review; tiếp theo section renderer và demo content | Không phụ thuộc N1 nếu chỉ đọc public DTO |
| Job Detail D.A | Dựng detail UI từ public DTO | Sau section renderer; không mở write authority |
| AV1 Homepage Settings | Admin config + public projection | Có thể làm độc lập |
| AV4 Media | Media library/upload contract | Có thể làm độc lập; security boundary riêng |
| AV6 Homepage CMS | CMS cho section đã dựng sẵn | Sau section renderer + AV4 |
| AV2 JobPosting Editor | Editor fields/detail content | Chuẩn bị shell; publish phải chờ N3 ServiceModel |
| D.B detail editor | Không giữ task riêng | Gộp vào AV2 |
| AFF | Rebase theo PlacementCase/Handling | Sau N1 + N2 + Owner clock decision |
| Assignment/conversion | Không mở rộng direct Assignment cũ | Qua N3 Placement + N4 actual-start |
| Commission | HRP không tính amount/rate/formula | Python tính; HRP giữ beneficiary context + external ref |

UI/CMS thuần có thể tiến cùng N0/N1. Không để hai stream cùng sửa schema/migration.
AV2 không publish trước ServiceModel. AFF không code trên timing cũ.

---

## 7. Lộ trình V7 sau Compatibility Gate

| Phase | Capability chính | Nền V6 phải tái sử dụng |
|---|---|---|
| V7.1 | Talent Repository | LaborProfile identity, observations, dedup policy |
| V7.2 | Talent Workbench | PlacementCase, stage, InteractionOutcome, NextAction |
| V7.3 | Matching & JobProposal | JobOpening, case-aware Application, proposal lifecycle |
| V7.4 | Placement & ServiceModel | Placement và ServiceModel từ N3 |
| V7.5 | Workforce Operations | Worker/Episode/Assignment bridge từ N4 |
| V7.6 | Supply Partner Network | Referral/partner attribution tách handling |
| V7.7 | Beneficiary & External Commission | Beneficiary decision + Python integration |
| V7.8 | HRP canonical Client/Demand; CRM app lo sales/CSKH UI | Client/company responsibility và demand history |
| V7.9 | HRP↔CRM integration gate | HRP command/query/outbox; Chatwoot/Zalo/ACL ở CRM app |
| V7.10 | HRP operational intelligence; CRM app lo AI hội thoại | Audit trail, governed commands, matching/risk facts |

Có thể nghiên cứu phase sau sớm; CRM app có thể xây Chat/CSKH UI, adapter và mock contract song song, không ghi HRP canonical bằng mock. Tích hợp production chỉ chạy khi từng HRP command contract và gate của luồng tương ứng đã khóa; Talent không phải chờ toàn bộ V7.8 B2B/V7.7 Beneficiary.

Quyết định Owner 13/09/2026 tách toàn bộ Chat/CSKH sang ứng dụng CRM riêng được ghi trong [HRP_CRM_INFRA_SPLIT.md](V7/HRP_CRM_INFRA_SPLIT.md). Tài liệu này thay thế mọi dòng cũ giao CRM engagement UI hoặc provider runtime cho HRP; không thay đổi trạng thái triển khai N1 Stage 3 hay quyền duyệt migration production.

---

## 8. Owner decisions còn mở

Các quyết định này không chặn N0, nhưng phải khóa trước task sử dụng:

1. AFF dùng calendar days hay business days; timezone và holiday calendar.
2. Role/permission/data-scope matrix cho command mới.
3. PII consent, retention, deletion và audit policy.
4. Placement failure reason catalog và confirmation evidence policy.
5. WorkClassification catalog; không trộn với ServiceModel.
6. Có hỗ trợ concurrent SECONDARY Assignment trong V7 MVP hay defer.

Tier 1 phải hỏi đúng thời điểm, kèm khuyến nghị và tác động. Không dùng câu hỏi chưa
cần thiết để chặn read-only discovery hoặc UI độc lập.

---

## 9. Chính sách task và audit mới

Tier 1 chọn audit mode ngay trong TASK:

- NONE: docs, style/copy, fixture/demo, UI reversible, read-only discovery.
- LIGHT: schema/migration, identity/dedup, critical lifecycle, permission/RLS,
  backfill, authority switch, integration boundary và N7 gate.

Không audit toàn repo theo nghi thức. Audit tập trung invariant, dữ liệu, permission
và regression có thể gây thiệt hại. Tier 1 tự chạy gate thông thường và không chờ
Tier 3 cho task NONE.

---

## 10. Chỉ thị tiếp quản cho Tier 0 mới

1. Xác nhận tài liệu này là Tier 0 authority hiện hành.
2. Giao Tier 1 task docs nhỏ để đồng bộ roadmap V7-native từ nhánh
   fix-ci-prisma-validate-r1 về main, chỉ lấy roadmap paths và review từng diff.
3. Giao Tier 1 mở **N0 Contract + Read-only Migration Audit**, Audit NONE.
4. Cho UI04 section renderer tiếp tục độc lập sau Owner visual acceptance.
5. Yêu cầu Tier 1 tách blocker CI lint-scope và integration environment; không
   trộn chúng vào N0 hoặc đổi domain roadmap.
6. Sau N0, duyệt decomposition N1 theo vertical slice; không phát hành mega-task
   sửa toàn schema.
7. Chỉ ký N7 khi reconciliation evidence và permanent fixtures đạt.

Prompt khởi động domain lane cho Tier 1:

> Đọc docs/TIER0_HANDOVER.md và các nguồn theo §3. Lập và thực hiện task N0
> read-only contract + migration audit cho V6 Native Foundation. Không sửa schema,
> không mutate database, không backfill. Inventory current models, migrations và
> intake writers; đo conflict và phân loại EXACT_SAFE, POSSIBLE_DUPLICATE,
> UNRESOLVED; xuất command/selector/permission contract cùng decomposition N1.
> Audit NONE. Được dùng sub-agent song song theo vùng đọc độc lập. Không để hai
> agent cùng sở hữu một output file.

---

## 11. Các điều Tier 0 phải ngăn

- quay lại coi V6+ là release nằm giữa V6 và V7;
- tạo Application mới chỉ để đổi tên CandidateSubmission;
- gắn placementCaseId unique lên HandlingAssignment và làm mất lịch sử;
- tạo Worker/Assignment ngay khi selected hoặc confirmed;
- coi Company Pool, availability hoặc relationship là mutable scalar authority;
- auto-merge identity chỉ theo phone/CCCD đơn lẻ;
- backfill Case/Placement/Referral khi thiếu evidence;
- để UI hoặc Admin generic PATCH critical lifecycle;
- dùng ProjectAssignment làm editorial ownership của SALE;
- để HRP tính commission amount/rate/formula thay ứng dụng Python;
- cho nhiều agent cùng sửa schema.prisma hoặc cùng sinh migration;
- mở V7 feature trên bounded context chưa qua V6 Native Compatibility Gate.

---

## 12. Định nghĩa thành công

V6 thành công khi public/admin sử dụng được, new writes dùng authority đích của V7,
legacy data được bảo toàn trung thực và N7 gate PASS.

V7 thành công khi mở rộng capability trên chính các aggregate đã canonical hóa
trong V6, không cần migration sửa sai, không dựng lại identity/case/placement/workforce
và không tạo nguồn sự thật song song.
