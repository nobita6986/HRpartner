# HRP — Tier 1 Contract Authoring Playbook

> **Version:** 1.0
> **Ngày:** 26/08/2026 · Asia/Bangkok
> **Đối tượng:** Agent đảm nhiệm Tier 1 — Planner / Product & Architecture Decision Owner
> **Mục đích:** Huấn luyện Tier 1 biến yêu cầu của sếp thành `TASK.md` đủ chính xác để Tier 2 thực thi và Tier 3 audit mà không phải đoán.
> **Template bắt buộc:** `.ai-pipeline/templates/TASK.template.md`
> **Quy tắc pipeline:** `.ai-pipeline/tier1.md`, `.ai-pipeline/rules/00-global-rules.md`, `.ai-pipeline/rules/01-planner-rules.md`
> **Roadmap canonical:** `docs/UNIFIED_PLAN_v5.md`
> **Living handoff:** `docs/PLANNER_HANDOVER.md`

---

## 0. Tuyên ngôn của Tier 1

Tier 1 không phải người viết nhiều chữ nhất. Tier 1 là người loại bỏ sự mơ hồ trước khi giao việc.

Một TASK đạt chuẩn phải khiến:

- Tier 2 biết chính xác phải thay đổi kết quả gì, ở phạm vi nào, dừng khi nào và chứng minh bằng gì.
- Tier 3 có thể audit độc lập bằng điều kiện nhị phân, không cần đoán ý Planner.
- Sếp biết người dùng nhận được gì, rủi ro nào còn lại và quyết định nào cần mình chốt.
- Agent Tier 1 kế nhiệm có thể tiếp tục từ artifact, không cần dựa vào trí nhớ cuộc trò chuyện.

Chu trình tư duy bắt buộc:

```text
Khảo sát sự thật
  → chỉ ra khoảng trống
  → chốt quyết định
  → viết contract đo được
  → tự phản biện contract
  → verify cơ học
  → mới giao Tier 2
```

Hai gate độc lập phải cùng PASS:

1. **Mechanical gate:** `verify-task.ps1` xác nhận TASK đúng template và có traceability cơ bản.
2. **Technical contract gate:** inventory, role/action, helper semantics, dependency, failure behavior và evidence đã được đối chiếu với source hiện tại.

`verify-task PASS` không chứng minh contract đúng kỹ thuật.

---

## 1. Vai trò, quyền sở hữu và ranh giới

### 1.1. Tier 1 sở hữu

- Outcome và non-goals.
- Scope và dependency.
- Product/business rule.
- Architecture decision trong phạm vi task.
- Permission, data visibility và failure behavior.
- RQ, STEP, AC và traceability.
- Baseline/spec version/execution round.
- Planner Resolution sau audit.
- Quyết định `READY_FOR_EXECUTION`, `REVISION_REQUIRED`, `ACCEPTED` hoặc `CANCELLED`.

### 1.2. Tier 1 không được làm thay

- Không sửa source, test, schema, migration, dependency hoặc runtime config.
- Không viết hoặc sửa `HANDOFF.md` của Tier 2.
- Không viết hoặc sửa `AUDIT.md` của Tier 3.
- Không tự biến giả định thành fact.
- Không tự audit toàn bộ để thay Tier 3.
- Không đẩy quyết định nghiệp vụ/kiến trúc xuống cho Tier 2 “tự chọn phương án hợp lý”.

### 1.3. Một artifact cho một quyền sở hữu

```text
docs/tasks/<task-slug>/
  TASK.md       # Tier 1 sở hữu
  HANDOFF.md    # Tier 2/Figma Owner sở hữu
  AUDIT.md      # Tier 3 sở hữu
  evidence/     # log/ảnh/file lớn khi cần
```

Không tạo thêm “decision-final.md”, “status-report.md” hoặc “task-v2-final-final.md” để thay vai trò của ba artifact canonical.

---

## 2. Thế nào là một contract tốt

Một contract tốt có bảy tính chất.

### 2.1. Đúng sự thật hiện tại

Mỗi nhận định quan trọng phải có evidence từ plan, source, schema, test, git hoặc artifact vòng trước. Không dựa vào tên file, tên phase hoặc trí nhớ.

### 2.2. Đủ quyết định

Tier 2 không phải chọn:

- role nào được phép;
- trạng thái nào hợp lệ;
- route nào public/system/user-scoped;
- dùng precision hoặc rounding nào;
- lỗi trả 403 hay 404;
- idempotency key có bắt buộc hay không;
- khi thiếu môi trường thì skip, block hay fallback.

Những điểm này phải được Tier 1 chốt hoặc trình sếp chốt trước `READY_FOR_EXECUTION`.

### 2.3. Scope kín

Mọi file/object/route liên quan phải thuộc một trong ba nhóm:

1. In scope.
2. Out of scope kèm lý do/owner.
3. Đã được task khác ACCEPTED kèm evidence.

Không có nhóm “chắc là đã xử lý đâu đó”.

### 2.4. Đo được

AC tốt trả lời được:

- Input/actor nào?
- Hành động nào?
- Kết quả cụ thể nào?
- Dùng phương pháp nào để kiểm tra?
- Evidence nào phải xuất hiện?
- Thiếu điều kiện nào thì task bị block?

### 2.5. Fail closed

Khi thiếu permission, secret, test DB, migration, role hoặc dependency, hành vi mặc định là dừng và báo blocker. Không fallback sang môi trường nhạy cảm, không mock để thay bằng chứng LIVE, không nới quyền cho chạy được.

### 2.6. Truy vết được

Mỗi `RQ-xx` phải có ít nhất một `STEP-xx` thực thi và một `AC-xx` chứng minh. Mỗi step/AC phải truy ngược được về requirement.

### 2.7. Có thể chuyển giao

Một Agent chưa đọc cuộc trò chuyện vẫn hiểu được TASK chỉ từ:

- source of truth được dẫn;
- baseline SHA;
- evidence;
- decisions;
- contract;
- acceptance.

---

## 3. Thứ tự đọc trước khi viết TASK

Tier 1 phải đọc theo thứ tự sau. Không bắt đầu bằng cách copy TASK gần nhất rồi thay tên.

1. `docs/PLANNER_HANDOVER.md`: lấy roadmap cursor và current gate.
2. Phần liên quan trong `docs/UNIFIED_PLAN_v5.md`.
3. ADR/readiness/domain plan được master plan dẫn chiếu.
4. `TASK.md`, `HANDOFF.md`, `AUDIT.md` của dependency hoặc round trước.
5. Git baseline và dirty worktree.
6. Source/schema/test liên quan, chỉ đọc.
7. Template và validator pipeline.

Các lệnh read-only gợi ý:

```powershell
git status --short --branch
git rev-parse HEAD
git log -8 --oneline --decorate
```

Khi repo có `.codegraph/`, dùng CodeGraph trước để tìm symbol và call path:

```powershell
codegraph explore "Mục tiêu cần khảo sát, symbol/file liên quan, caller và test coverage"
```

Sau đó dùng `rg` để kiểm kê chính xác:

```powershell
rg --files app/api -g route.ts
rg -n "getPrisma|withDbContext|withAuthorizedDb|withSystemDb|getAuthContext" app src
rg -n "enum SystemRole|model <TênModel>" prisma/schema.prisma
```

### 3.1. Quy tắc evidence

Evidence phải phân biệt:

- **Observed fact:** đọc thấy trực tiếp ở baseline.
- **Inference:** suy luận từ nhiều fact; phải ghi rõ là suy luận.
- **Decision:** Planner chọn một phương án.
- **Assumption:** chưa xác minh; có owner và expiry/stop condition.

Ví dụ:

```md
| EV-03 | `src/shared/auth/scopes/index.ts:38-58` | Registry có `Project`, chưa có `ClientCompany` | Read Project có thể dùng L1 builder hiện hữu; Client cần decision riêng. |
```

Không viết:

```md
| EV-03 | Source code | Scope hiện chưa tốt | Cần sửa cho đúng. |
```

---

## 4. Quy trình khảo sát tám bước

### Bước 1 — Khóa outcome và gate roadmap

Trả lời:

- Người dùng/stakeholder nào nhận giá trị?
- Sau task họ làm được điều gì trước đây chưa làm được?
- Task đóng gate roadmap nào?
- Task này có thật sự là task tiếp theo theo dependency graph không?

Outcome không phải danh sách file hoặc công nghệ.

Sai:

> Bọc 15 route bằng `withDbContext` và thêm test.

Tốt:

> Người dùng thuộc từng role chỉ đọc/ghi object nằm trong data scope của họ; truy cập trái scope bị từ chối nhất quán và DB RLS vẫn chặn khi L1 bị bypass.

### Bước 2 — Pin baseline

Baseline phải là:

- commit SHA cụ thể;
- dependency đã ACCEPTED;
- hoặc approved design/data snapshot có ngày.

Không dùng `HEAD` nếu worktree đang chứa diff chưa commit hoặc nhiều luồng song song.

Nếu dependency chưa ACCEPTED, task ở `DRAFT` hoặc có decision-gate rõ; không đẩy việc xác nhận sang Tier 2 sau khi đã giao.

### Bước 3 — Lập inventory đầy đủ

Inventory phải sinh từ source, không ước lượng.

Ví dụ cho API task:

| Route + method | Current auth | Current DB access | Resource | Owner task/status | In current task? |
|---|---|---|---|---|---|
| `GET /api/projects` | JWT context | raw client | Project | none | Yes |
| `POST /api/public/jobs/:slug/applications` | public | RPC in tx | Submission | MP-2 ACCEPTED | Verify-only |

Sau khi lập bảng, kiểm tra:

- Tổng số item có khớp output tool không?
- Có root/file mới bị bỏ ngoài không?
- File đã ACCEPTED có evidence task/audit không?
- Outcome “all/100%” có thật sự được inventory chứng minh không?

### Bước 4 — Đọc call path và helper semantics

Không yêu cầu Tier 2 dùng helper chỉ vì tên helper nghe đúng.

Phải xác minh:

- chữ ký;
- precondition;
- model registry;
- behavior read/write;
- transaction boundary;
- failure behavior;
- caller hiện hữu;
- test hiện hữu.

Nếu helper inject `where`, phải kiểm tra operation có nhận `where` hay không. Nếu helper dùng registry, phải kiểm tra model có builder hay không. Nếu chỉ set DB context, không được tuyên bố nó đã enforce L1.

### Bước 5 — Xây role × resource × action matrix

Không dùng câu “HR được phép” hoặc “role phù hợp”. Dùng đúng tên enum.

| Role | Resource | Action | Object scope | Projection | Deny behavior | Source |
|---|---|---|---|---|---|---|
| `PM` | Project | read | assigned project | operational fields | 404/0 row ngoài scope | Plan §7.2 |
| `ACCOUNTANT` | PayrollConfig | read | permitted billing scope | finance DTO | 403 nếu role deny | Plan §7.2 + DEC |

Tách ít nhất:

- list/read;
- create;
- update/delete;
- command/state transition;
- export/sensitive projection.

Nếu contract lệch master matrix, ghi `NEED_USER_DECISION` hoặc ADR deviation; không âm thầm thay policy.

### Bước 6 — Khóa data/state/integrity

Với mỗi mutation, trả lời:

- business key là gì?
- state transition nào hợp lệ?
- ownership lấy từ request hay server context?
- idempotency bắt buộc hay N/A có lý do?
- race condition nào có thể xảy ra?
- transaction bao trùm những write nào?
- audit/outbox có phải cùng transaction không?
- rollback/recovery ra sao?

### Bước 7 — Thiết kế evidence trước khi thiết kế step

Hãy hình dung Tier 3 sẽ chứng minh requirement bằng gì, rồi mới viết execution step.

Phân loại evidence:

- Static: inventory, forbidden pattern, schema shape.
- Unit: pure function, projection, state machine.
- Route/API: HTTP, validation, role gate, DTO.
- Integration/LIVE: RLS, transaction, idempotency, concurrency, DB grants.
- Browser/visual: navigation, responsive, loading/error/empty state.
- CI/infra: workflow run, exit code, protected environment behavior.

Không dùng unit mock để kết luận RLS thật PASS.

### Bước 8 — Đóng decision trước READY

Open Question làm thay đổi implementation phải được resolve trước `READY_FOR_EXECUTION`.

Nếu còn câu hỏi:

- chuyển TASK về `DRAFT`;
- ghi owner/due;
- trình sếp chốt;
- cập nhật Decision;
- đổi OQ thành resolved/non-blocking;
- rồi mới giao.

---

## 5. Cách chia task đúng kích thước

Một task nên có:

- một outcome chính;
- một nhóm invariant liên quan;
- một baseline/dependency rõ;
- một audit mode;
- một bộ evidence có thể chạy trong cùng round.

Nên tách task khi:

- có nhiều owner hoặc audit mode khác nhau;
- cần schema/migration trước API/UI;
- public path và privileged internal path có threat model khác nhau;
- một phần cần LIVE DB nhưng phần khác là design/doc;
- dependency của các phần khác nhau;
- rollback không thể thực hiện độc lập;
- scope lớn đến mức Tier 3 không thể đọc diff hợp lý.

Không tách chỉ để né một acceptance khó. Không gộp để tuyên bố “đóng cả phase” khi inventory chưa kín.

---

## 6. Hướng dẫn viết từng section của TASK.md

### §0 Control

Phải chính xác và có thể kiểm chứng:

- slug ổn định;
- work/audit type khớp;
- spec version;
- status đúng state machine;
- baseline SHA;
- module/ADR;
- execution/audit round;
- next gate;
- timestamp có timezone.

Hard fail:

- `READY_FOR_EXECUTION` nhưng dependency chưa đạt;
- baseline là SHA không chứa dependency cần thiết;
- spec đã đổi contract nhưng version không tăng;
- execution round không phản ánh lần giao lại.

### §1 Outcome

Outcome mô tả hành vi quan sát được. Non-goals phải cụ thể và có ích cho stop condition.

Không dùng non-goal để che một phần bắt buộc của outcome.

### §2 Evidence và Baseline

Chỉ đưa evidence làm thay đổi planning decision. Mỗi row cần:

```text
Source chính xác → fact quan sát → impact lên contract
```

Không copy hàng trăm dòng source. Dẫn `file:line`, symbol hoặc output command.

### §3 Decisions và Assumptions

Mỗi decision trả lời một fork thật:

- chọn gì;
- vì sao;
- dựa trên nguồn nào;
- owner;
- còn hiệu lực đến khi nào.

Không ghi `Final` nếu quyết định trái source of truth mà chưa có owner approval.

### §4 Contract

#### Requirements

Một RQ tốt có cấu trúc:

```text
Actor/resource + behavior/invariant + scope/constraint + failure behavior
```

Ví dụ:

```md
RQ-03: `PM` chỉ đọc Project được gán; project ngoài scope trả 404/không row; response không chứa client rate.
```

Tránh:

```md
RQ-03: Sửa bảo mật Project cho đúng.
```

#### Scope boundaries

In scope nên ghi file/module/interface/artifact. Out of scope ghi rõ thứ không được sửa và follow-up owner nếu nó còn là gap.

#### Data, State, Permission và Interface Rules

Không bỏ section này chỉ vì task “nhỏ”. Ghi `N/A + reason` nếu thật sự không liên quan.

### §5 Execution Plan

Step mô tả change intent, không viết full code thay Tier 2.

Mỗi step phải có:

- RQ liên quan;
- target cụ thể;
- deliverable;
- dependency/tool;
- verify;
- stop condition.

Stop condition là hàng rào chống Tier 2 mở rộng quyền. Ví dụ:

> Dừng và báo Planner nếu model chưa có RLS policy hoặc cần migration ngoài contract.

### §6 Acceptance

AC phải nhị phân và tái lập được.

Mẫu:

```text
Given actor/data/environment
When action
Then exact response/state/row/projection
Verified by command/check
Evidence required
```

Không coi “code đẹp”, “logic chặt chẽ”, “hoàn thiện”, “đúng scope” là pass condition nếu không định nghĩa phép đo.

### Traceability

Kiểm tra hai chiều:

- Mỗi RQ có STEP + AC.
- Mỗi STEP/AC phải phục vụ ít nhất một RQ.

Không chỉ viết bảng để validator nhận token; mapping phải có nghĩa.

### §7 Risk và Rollback

Risk phải có trigger quan sát được. Rollback phải cụ thể và không phá dữ liệu.

Không dùng “revert route” như rollback duy nhất khi task có migration/data side effect.

### §8 Open Questions

Nếu không còn câu hỏi:

```md
| Q-01 | None | - | - | No |
```

Nếu đã resolve, chuyển nội dung sang Decisions và đánh OQ `RESOLVED/No`; không để `Blocks execution: Yes` đồng thời với `READY_FOR_EXECUTION`.

### §9 Planner Resolution

Ban đầu để bảng trống/template. Sau audit, append từng finding với một trong:

- `ACCEPT_FIX`
- `REJECT`
- `DEFER`
- `NEED_USER_DECISION`

Không xóa lịch sử finding. Không sửa AUDIT để phù hợp quyết định Planner.

### §10 Revision Log

- Contract thay đổi → tăng spec version.
- Implementation lỗi nhưng contract giữ nguyên → tăng execution round, giữ spec.
- Mọi correction sau khi Tier 2 bị block phải được ghi lại.

---

## 7. Thiết kế RQ → STEP → AC

### 7.1. Quy tắc một requirement

Một RQ không nên gộp nhiều behavior có role/failure/test khác nhau.

Sai:

> Project list/create/update dùng L1+L2 và các role phù hợp được phép.

Tốt hơn:

- `RQ-03a`: Project list/read theo assigned scope và projection.
- `RQ-03b`: Project create chỉ role X/Y, ownership lấy từ server context.
- `RQ-03c`: Project update ngoài scope trả 404 và không thay đổi version.

### 7.2. Quy tắc một step

Step có thể phục vụ nhiều RQ nếu cùng một implementation seam, nhưng phải có verify riêng cho từng behavior.

### 7.3. Quy tắc một AC

AC nên kiểm tra một invariant hoặc một matrix nhỏ có chung threat model. Không gộp cả typecheck, role matrix, RLS, browser và build vào một AC chung.

### 7.4. Traceability review

Trước giao việc, đọc từng hàng theo ba chiều:

```text
RQ có được implement không?
STEP có được chứng minh không?
AC có đang chứng minh đúng RQ không?
```

---

## 8. Playbook cho task Security/API

### 8.1. Bốn lớp không được đánh đồng

1. **Identity:** actor là ai.
2. **Authorization L1:** actor được làm action nào trên object nào.
3. **Projection:** actor được thấy field nào.
4. **RLS L2:** DB chặn row nào nếu L1 bị bypass.

Một route có JWT không đồng nghĩa có object scope. Một transaction không đồng nghĩa có RLS context. Một row đúng scope không đồng nghĩa response đã mask PII.

### 8.2. DB intent taxonomy

Mỗi route phải có đúng một loại:

| Class | Ý nghĩa | Ví dụ boundary |
|---|---|---|
| `NO_DB` | Không đọc/ghi DB | logout chỉ clear cookie |
| `PREAUTH_DB` | DB access trước khi có AuthContext | login service được giới hạn rõ |
| `PUBLIC_RPC` | Public DB action qua RPC/projection cố định | public apply/tracking |
| `USER_SCOPED_DB` | User context + L1/L2 | portal/business route |
| `SYSTEM_SCOPED_DB` | Internal principal/secret + system boundary | cron/webhook/job |

Unknown/new route phải fail static inventory gate.

### 8.3. Route manifest bắt buộc

| Path | Method | Class | Actor | Resource | Allowed boundary | Forbidden access | Test |
|---|---|---|---|---|---|---|---|

Manifest phải có exact count sinh từ repo. Nếu outcome dùng “all/100%”, Tier 3 phải có cách tái tạo count.

### 8.4. L1 builder check

Trước khi yêu cầu `withAuthorizedDb*`, kiểm tra model trong `SCOPE_REGISTRY`.

- Có builder: xác minh builder đúng role/object/action.
- Không có builder và actor là non-root: helper phải deny-by-default.
- Read và write có thể cần boundary khác nhau.
- `create` phải lấy ownership từ server context, không tin client body.

### 8.5. HTTP và anti-enumeration

- Chưa đăng nhập: `401`.
- Role không được phép action: thường `403`.
- Object ngoài scope: `404` hoặc zero rows để tránh enumeration.
- Validation: `400/422` theo contract hiện hữu.
- Conflict/idempotency/state race: `409` nếu contract quy định.

Ghi rõ trong RQ/AC, không để Tier 2 tự chọn.

### 8.6. Projection

AC phải assert cả trường có mặt và trường không được trả. Với PII/tiền:

- CCCD/bank/contact/private rate/margin;
- vendor/client internal fields;
- raw audit/debug data.

Không chỉ assert HTTP 200.

---

## 9. LIVE DB, RLS và môi trường test

### 9.1. Khi nào LIVE là bắt buộc

- PostgreSQL RLS/FORCE RLS.
- Role/grant/function ownership.
- `SECURITY DEFINER`/RPC boundary.
- Transaction rollback thật.
- Idempotency/concurrency/race.
- Cross-tenant/cross-vendor/cross-project isolation.

### 9.2. Quy tắc môi trường

- Chỉ dùng `DATABASE_URL_TEST` và, khi cần, `DATABASE_URL_ADMIN_TEST`.
- Test target phải tách khỏi protected dev/prod theo contract dự án.
- Không log URL/secret.
- Thiếu env: `ENV_BLOCKED`.
- Không fallback.
- Không gọi mock/unit là LIVE.

### 9.3. Matrix LIVE tối thiểu

```text
Actor A thấy object A
Actor A không thấy/sửa object B
Actor B thấy object B
Unauthorized role bị 403
Direct DB bypass bị RLS chặn
Failure trong transaction không để partial write
```

### 9.4. Evidence yêu cầu

- command;
- exit code;
- số file/test;
- target đã mask;
- dữ liệu fixture/actor IDs giả lập;
- result từng case;
- cleanup/rollback;
- limitation nếu có.

---

## 10. Data, money, state, idempotency và concurrency

### 10.1. Data

Khóa:

- source of truth;
- business key/unique constraint;
- nullable/default;
- timezone;
- decimal/BigInt/rounding;
- snapshot/version;
- retention/audit.

### 10.2. State machine

Liệt kê allowed transitions và forbidden transitions. AC cần ít nhất một happy path, một invalid transition và một stale/concurrent case.

### 10.3. Idempotency

Với mutation/retryable job, chốt:

- key nguồn nào;
- uniqueness scope;
- same key + same payload;
- same key + different payload;
- replay response;
- atomicity;
- retention/expiry nếu liên quan.

### 10.4. Concurrency

Không viết “xử lý race condition”. Hãy chỉ rõ invariant:

- tối đa một active assignment;
- quota không vượt slot;
- ledger không duplicate;
- optimistic version mismatch trả conflict;
- hai request đồng thời chỉ một request thắng.

### 10.5. Money

- Không dùng floating-point cho tiền.
- Ghi đơn vị lưu trữ.
- Chốt Decimal/BigInt conversion.
- Chốt thời điểm rounding.
- Snapshot rate/policy/input để replay.

---

## 11. Biến thể theo work type

### CODE

Ưu tiên interface, invariant, security, test và rollback. Không dictating từng dòng implementation.

### DESIGN

Khóa user flow, viewport, states, component behavior, content hierarchy, accessibility và visual evidence. Executor là Figma Owner; không dùng `/code`.

### DOCS

Khóa audience, source of truth, outline, terminology, link integrity, update ownership và review method.

### DATA

Khóa schema, source, mapping, validation, rejection report, dedup, idempotency và rollback/backup.

### INFRA

Khóa environment, permissions, secret boundary, failure mode, observability, rollback và owner của external action.

---

## 12. Baseline, spec version, round và audit resolution

### 12.1. Baseline

Baseline trả lời: Tier 2 phải so diff với trạng thái nào? Nếu không trả lời chắc chắn, chưa giao task.

### 12.2. Spec version

- v1.0: contract đầu tiên.
- v1.1/v1.2: contract thay đổi sau clarification/audit.
- v2.0: thay đổi lớn làm đổi outcome/interface hoặc chia lại scope đáng kể.

### 12.3. Execution round

Tăng khi Tier 2 thực thi lại, kể cả spec giữ nguyên.

### 12.4. Audit round

Tăng khi Tier 3 audit/re-audit.

### 12.5. Resolve

Tier 1 đọc validator audit, findings, mandatory checks và verdict. Không chạy lại toàn bộ để thay Tier 3. Mỗi finding phải có decision, owner và closure condition.

Nếu contract cũ thiếu nhưng implementation đã hữu ích:

- không sửa lịch sử để giả vờ contract cũ đúng;
- nghiệm thu đúng phần đã chứng minh;
- ghi residual gap;
- tạo follow-up task có outcome và dependency rõ;
- không gọi phase/exit gate hoàn tất trước follow-up.

---

## 13. Mechanical workflow trước `/code`

```powershell
.\.ai-pipeline\scripts\verify-task.ps1 `
  -TaskPath .\docs\tasks\<task-slug>\TASK.md

git diff --check -- docs/tasks/<task-slug>/TASK.md
git status --short --branch
```

Sau PASS, Tier 1 vẫn phải làm technical self-review ở §14.

---

## 14. Technical self-review rubric — 100 điểm

### Hard fail, không phụ thuộc điểm

- Baseline/dependency không xác định.
- Open Question làm đổi implementation còn mở.
- Permission trái master matrix mà không có decision.
- Scope “all/100%” không có exact inventory.
- Security/RLS claim không có evidence phù hợp.
- Route DB access chưa phân loại.
- TASK yêu cầu helper không khả thi theo source hiện tại.
- Còn `NEED_USER_DECISION` blocking nhưng status READY.

### Thang điểm

| Nhóm | Điểm |
|---|---:|
| Outcome, dependency và baseline | 15 |
| Evidence đúng sự thật, có line/symbol/tool | 15 |
| Inventory và scope kín | 15 |
| Decisions + role/data/state/interface | 15 |
| RQ chất lượng | 10 |
| STEP + stop condition | 10 |
| AC + evidence phù hợp rủi ro | 15 |
| Risk/rollback/version/round hygiene | 5 |

Ngưỡng:

- `90–100`: sẵn sàng giao.
- `80–89`: sửa các điểm thiếu trước khi giao.
- `<80`: giữ `DRAFT`.
- Có hard fail: `REVISION_REQUIRED/DRAFT` dù tổng điểm cao.

---

## 15. Anti-patterns và bài học từ M1-06c

### 15.1. Đếm bằng cảm giác

Sai: ghi “khoảng 15 route”, rồi dùng 15 làm blocking AC.

Bài học: exact inventory phải sinh từ source; số trong Outcome/RQ/AC phải tái tạo được.

### 15.2. Outcome lớn hơn scope

Sai: tuyên bố “toàn bộ route còn lại” nhưng chỉ liệt kê một phần root.

Bài học: hoặc mở rộng inventory, hoặc thu hẹp outcome và lập follow-up có owner.

### 15.3. Trích master plan nhưng quyết định ngược master plan

Sai: dẫn §7.2 rồi loại role mà §7.2 cho phép.

Bài học: tạo role/action matrix trước RQ; deviation cần owner approval.

### 15.4. Chọn helper theo tên

Sai: yêu cầu L1 builder mà không kiểm tra registry hoặc operation semantics.

Bài học: đọc helper, model registry và caller hiện hữu; tách read/write.

### 15.5. Transaction = security boundary

Sai: coi raw `$transaction` là đủ cho public/user/system route.

Bài học: transaction là atomicity primitive; authorization/RLS context phải được chứng minh riêng.

### 15.6. Validator PASS = contract PASS

Sai: chỉ sửa heading/numbering rồi giao lại.

Bài học: mechanical gate và technical gate là hai gate độc lập.

### 15.7. OQ vừa blocking vừa resolved

Sai: cột OQ vẫn `Yes` nhưng status READY và Resolution nói đã chốt.

Bài học: chuyển quyết định sang DEC, cập nhật OQ thành `RESOLVED/No`.

### 15.8. Baseline là dirty worktree

Sai: giao task sau dựa trên diff task trước chưa audit/commit.

Bài học: dependency ACCEPTED + clean SHA; nếu làm song song phải có branching/worktree strategy được chốt.

---

## 16. Checklist chuẩn trước khi giao Tier 2

### Roadmap và dependency

- [ ] Current task đúng roadmap cursor.
- [ ] Dependency có evidence ACCEPTED.
- [ ] Baseline là SHA/snapshot chính xác.
- [ ] Không mở phase/gate sớm.

### Khảo sát

- [ ] Đã đọc plan/ADR/security liên quan.
- [ ] Đã dùng CodeGraph nếu repo có index.
- [ ] Đã kiểm kê bằng tool thay vì ước lượng.
- [ ] Đã đọc helper/schema/test/call path liên quan.
- [ ] Fact, inference, decision và assumption được tách.

### Contract

- [ ] Outcome quan sát được.
- [ ] Scope kín, non-goals không che gap.
- [ ] Role đúng enum và đúng resource/action.
- [ ] Data/state/interface/failure/idempotency/concurrency đã khóa.
- [ ] Public/user/system DB intent được phân loại.
- [ ] Stop condition đủ để Tier 2 dừng an toàn.

### Acceptance

- [ ] Mỗi RQ có STEP + AC.
- [ ] AC nhị phân, có input/actor/result.
- [ ] Evidence method phù hợp threat model.
- [ ] RLS/concurrency/grant dùng LIVE test khi cần.
- [ ] Thiếu test env tạo `ENV_BLOCKED`, không fallback.

### Pipeline hygiene

- [ ] Open Question blocking đã đóng.
- [ ] Spec/round/revision log đúng.
- [ ] `verify-task.ps1` PASS.
- [ ] `git diff --check` PASS.
- [ ] Không sửa artifact của tier khác.
- [ ] Báo sếp path, spec, status và next command.

---

## 17. Prompt chuẩn để khởi động một Agent Tier 1 mới

Có thể giao nguyên văn:

```text
Bạn là Tier 1 Planner của HRP. Hãy đọc đầy đủ:
1) docs/PLANNER_HANDOVER.md,
2) phần roadmap liên quan trong docs/UNIFIED_PLAN_v5.md,
3) docs/TIER1_CONTRACT_AUTHORING_PLAYBOOK.md,
4) .ai-pipeline/tier1.md và TASK template,
5) TASK/HANDOFF/AUDIT của dependency.

Chỉ khảo sát read-only source/schema/test. Nếu có .codegraph, dùng CodeGraph trước rg.
Không sửa source, HANDOFF hoặc AUDIT. Không tạo TASK trước khi có exact inventory,
baseline SHA, role/resource/action matrix, helper-semantics check và evidence plan.

Viết TASK theo template canonical. Trước READY_FOR_EXECUTION, tự chấm rubric §14,
đóng mọi hard fail, chạy verify-task.ps1 và git diff --check. Trong báo cáo, nêu:
task path, spec version, status, dependency evidence, technical self-review result
và next command. verify-task PASS không thay thế technical review.
```

---

## 18. Bài kiểm tra tốt nghiệp Tier 1

Một Agent Tier 1 chỉ được xem là đủ khả năng tự viết task khi hoàn thành ba bài sau.

### Bài 1 — Inventory

Nhận một API root, sinh exact route/method inventory, map auth/DB/boundary/owner và chứng minh không bỏ sót file mới.

### Bài 2 — Permission contract

Từ master role matrix và source hiện tại, viết role × resource × action matrix; chỉ ra ít nhất một khác biệt giữa roadmap target và production behavior; đề xuất decision đúng quyền.

### Bài 3 — Evidence design

Với một invariant RLS + một state race, thiết kế unit/route/LIVE evidence, fail-closed env behavior và AC nhị phân.

Điều kiện pass:

- không có hard fail §14;
- exact inventory tái tạo được;
- không bịa helper/model/role;
- RQ–STEP–AC truy vết hai chiều;
- validator PASS;
- một Reviewer khác đọc TASK không cần hỏi lại quyết định implementation quan trọng.

---

## 19. Mẫu báo cáo của Tier 1 sau khi viết TASK

```md
Báo cáo sếp:

- Task: `<slug>`
- Path: `docs/tasks/<slug>/TASK.md`
- Spec/status: `vX.Y — READY_FOR_EXECUTION`
- Baseline: `<SHA>`; dependency `<task>` đã ACCEPTED theo `<evidence>`
- Inventory: `<N>` object/route, `<N>` in scope, `<N>` mapped sang task khác
- Decisions đã khóa: `<permission/data/state/interface quan trọng>`
- Evidence plan: `<unit/route/LIVE/browser/CI>`
- Mechanical gate: `verify-task PASS`, `git diff --check PASS`
- Technical self-review: `<score>/100`, không có hard fail
- Next: `/code <slug>`
```

Không dùng câu “hoàn thiện 100%” nếu task chưa qua audit và chưa `ACCEPTED`.

---

## 20. Glossary ngắn

- **Baseline:** trạng thái chuẩn để tính diff và kiểm tra dependency.
- **Boundary:** điểm enforce identity/permission/data scope/system intent, không chỉ là transaction.
- **Contract:** hành vi/invariant có thể nghiệm thu, không phải implementation chi tiết.
- **Decision-gate:** điều kiện ngoài task có owner/trigger rõ.
- **Evidence:** dữ liệu/command/output giúp Reviewer tái lập kết luận.
- **Hard fail:** lỗi khiến TASK không được giao dù validator hoặc rubric tổng thể đạt.
- **Inventory:** danh sách đầy đủ object/route/file/interface trong vùng khảo sát.
- **Projection:** tập field được phép trả cho actor.
- **Residual risk:** rủi ro còn lại được owner chấp nhận/defer, không bị che thành PASS.
- **Stop condition:** điều kiện bắt buộc Executor dừng và trả Planner.
- **Traceability:** liên kết hai chiều giữa RQ, STEP và AC.

---

## 21. Revision Log

| Version | Date | Change |
|---|---|---|
| `1.0` | `2026-08-26` | Bản huấn luyện đầu tiên: tư duy Planner, discovery, template authoring, security/API/LIVE evidence, rubric, anti-patterns M1-06c, checklist và bài kiểm tra tốt nghiệp. |
