# HRP — Ranh giới tự động hóa bằng n8n

> Trạng thái: chính sách kiến trúc và delivery. Tài liệu này tự nó không cấp quyền mở workflow production, credential, endpoint, quyền truy cập database hoặc rollout.

n8n là ứng viên orchestration mặc định cho công việc lặp lại, bất đồng bộ và xuyên hệ thống trong HRP. Mục tiêu là giảm code connector, scheduler, retry và workflow vận hành trong khi HRP vẫn là authority của trạng thái nghiệp vụ, bảo mật và dữ liệu bền vững.

## 1. Áp dụng decision gate

Trước khi Tier 1 tự xây scheduler, connector, notification worker hoặc workflow xuyên hệ thống, phải phân loại capability:

| Decision | Khi sử dụng | Đầu ra bắt buộc |
|---|---|---|
| `N/A` | Task không có bề mặt orchestration lặp lại/xuyên hệ thống | Lý do một câu trong TASK |
| `ORCHESTRATE` | n8n có thể điều phối API/event hiện có mà không trở thành business authority | Boundary, trigger, credential, retry/idempotency và observability contract; platform/source = n8n |
| `CUSTOM` | Hành vi phải nằm trong transaction HRP, có yêu cầu latency/throughput n8n không đáp ứng, hoặc có blocker compatibility/security đã được chứng minh | `CUSTOM_AUTOMATION_JUSTIFICATION` kèm evidence |

`BUILD_VS_AUTOMATE` độc lập với `BUILD_VS_ADOPT`. Một task có thể adopt library bên trong HRP đồng thời chọn `ORCHESTRATE` với n8n cho điều phối bên ngoài.

## 2. Giữ authority trong HRP

```text
HRP canonical transaction
  → durable outbox/event
  → signed delivery to n8n
  → external systems and operator steps
  → idempotent callback to a narrow HRP API
  → delivery/audit status only
```

| n8n có thể sở hữu | HRP bắt buộc sở hữu |
|---|---|
| Lịch chạy, fan-out, gọi connector, bounded retry/backoff và escalation | Authentication, authorization, RLS và object permission |
| Template kênh/tin nhắn và delivery routing | Nội dung canonical, consent và điều kiện người nhận |
| Chờ phản hồi bên ngoài hoặc tín hiệu phê duyệt nội bộ | Validation và state transition cuối cùng |
| Điều phối OCR/virus scan/classification | Evidence metadata, access policy, retention và quarantine authority |
| Báo cáo read-only và tổng hợp vận hành | Source-of-truth data và phép tính tài chính/domain |
| Chẩn đoán execution và cảnh báo operator | Domain audit bền vững và compliance evidence |

n8n không được ghi trực tiếp vào bảng domain HRP. Nếu báo cáo không thể dùng API, n8n chỉ được nhận database identity read-only chuyên biệt hoặc replica sau một security review riêng.

## 3. Các ứng viên phù hợp trong HRP

| Ưu tiên | Candidate | Trigger | Công việc của n8n | Boundary của HRP |
|---|---|---|---|---|
| 1 | Phân phối JobPosting | Outbox event `JobPostingPublished` | Zalo OA, Messenger/Facebook, email, reminder theo lịch và delivery callback | Publish authorization/state và public-safe projection vẫn thuộc HRP |
| 2 | Giao tiếp với ứng viên | Application/interview/next-action event | Xác nhận, nhắc lịch, channel fallback và escalation | Candidate state và contact consent vẫn thuộc HRP |
| 3 | Nhắc việc vận hành | Deadline/SLA schedule hoặc event | Nhắc assignment/job sắp hết hạn và stale-work alert | n8n không expire hoặc transition record |
| 4 | Điều phối CRM ↔ HRP | Event/request theo shared contract đã accepted | Mapping, bounded retry và incident routing | Mỗi hệ thống vẫn enforce contract, delegated user, organization binding và object permission |
| 5 | Evidence post-processing | Evidence stored/quarantined event | Virus scan, OCR, classification và thông báo manual review | Raw evidence storage và canonical metadata ở sau Evidence Gateway |
| 6 | Hỗ trợ approval | Pending approval do HRP tạo | Notify, wait, remind và thu nhận approval signal | HRP reauthenticate, authorize và commit quyết định |
| 7 | Báo cáo và vận hành | Schedule | Recruitment funnel, anomaly summary, backup/CI/deploy alert | Không domain mutation và không financial authority |

### Pilot đầu tiên

Pilot đầu tiên nên theo sau P1-A authoring/publish:

```text
JobPosting PUBLISHED
  → HRP outbox event with eventId/correlationId
  → n8n distributes to configured channels
  → n8n schedules close-date reminders
  → n8n returns per-channel delivery outcomes
  → HRP stores delivery status without changing publish state
```

Trang việc làm public của P1-A không được phụ thuộc n8n. Lỗi phân phối không được rollback một HRP publish transaction đã thành công.

## 4. Không bao giờ giao các capability sau cho n8n

- Prisma migrations, production backfills or schema ownership.
- Auth, RLS, effective-user/delegation policy or organization binding.
- Candidate conversion, SourceClaim, ProjectAssignment or HandlingAssignment transitions.
- Placement, CommissionLedger, payroll or other money calculations.
- Domain concurrency locks, mutation idempotency authority or canonical deduplication.
- Public Apply validation/security boundary.
- Rich-content validation/sanitization or public rendering authority.
- Permanent storage of CCCD, raw evidence, access tokens or secrets in workflow data.
- Autonomous hiring/rejection decisions.

Workflow n8n có thể gọi một HRP command hẹp cho các capability này, nhưng command phải an toàn ngay cả khi workflow độc hại, chạy trùng, chạy trễ hoặc bị replay.

## 5. Bảo vệ server n8n

Trước mọi kết nối production HRP:

- Run n8n with its own database, encryption key, backup and restore test.
- Use TLS, restricted administration, MFA where available and separate development/production instances or an equivalent promotion process.
- Store Zalo/Meta/email credentials in n8n credentials or an approved secret manager; never in public HRP Admin Settings, workflow JSON or this repository.
- Give each workflow a least-privilege service identity; do not reuse an HRP admin/human token.
- Protect inbound webhooks with signature, timestamp, audience and replay checks.
- Redact/prune execution payloads; do not retain PII merely because execution history is convenient.
- Disable or review risky, community and Code nodes. Run `n8n audit` after setup and periodically.
- Use bounded timeout/retry and an error workflow. An automatic retry must not reuse expired authority.
- Keep workflow exports/version history in a private repository. If the installed edition lacks built-in source-control environments, export reviewed workflow JSON and promote it manually.
- Do not use n8n execution history as HRP's sole audit record.

Tài liệu chính thức:

- [n8n documentation](https://docs.n8n.io/)
- [n8n security audit](https://docs.n8n.io/hosting/securing/security-audit/)
- [n8n source control and environments](https://docs.n8n.io/source-control-environments/create-environments/)
- [n8n external binary storage](https://docs.n8n.io/hosting/scaling/external-storage/)

## 6. Định nghĩa từng workflow trước khi bật

Mỗi workflow liên kết HRP cần một contract ngắn:

| Field | Nội dung bắt buộc |
|---|---|
| Owner | HRP owner, workflow maintainer và incident contact |
| Trigger | Chính xác event/API/schedule và producer |
| Inputs | Versioned schema, kích thước tối đa và PII classification |
| Authority | Service identity, scope và HRP endpoint được phép |
| Idempotency | Event/idempotency key, hành vi duplicate và replay window |
| Retry | Giới hạn attempt, timeout, backoff và terminal failure handling |
| Output | External side effect và HRP callback idempotent |
| Observability | Correlation ID, safe log, metric và nơi nhận alert |
| Recovery | Quy trình replay/reconciliation và manual stop switch |
| Promotion | Development proof, reviewed export và production enablement owner |

Thay đổi workflow tác động public communication, PII, money, auth hoặc canonical state phải dùng V2 task và audit lane phù hợp. Chỉnh cosmetic message template có thể dùng FAST task hoặc thủ tục vận hành trực tiếp nếu không đổi contract.

## 7. Acceptance cho pilot

Pilot n8n đầu tiên chỉ sẵn sàng khi synthetic evidence chứng minh:

1. duplicate delivery of the same outbox event does not duplicate the HRP-side result;
2. n8n unavailable leaves the HRP transaction successful and the event recoverable;
3. invalid signatures, stale timestamps and wrong audience are rejected;
4. retry is bounded and ends in an observable terminal state;
5. secrets and PII are absent from exported workflows and routine logs;
6. an operator can disable the workflow and reconcile pending events;
7. development workflow promotion is reviewable and reproducible.

Credential Zalo/Meta thật và dữ liệu ứng viên thật là input của production enablement, không phải coding gate. Implementation và test phải dùng synthetic payload cùng non-production credential.
