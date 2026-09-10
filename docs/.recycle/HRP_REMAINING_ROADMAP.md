# HRP — Remaining Execution Roadmap

> **Cập nhật:** 28/08/2026 · Asia/Bangkok
> **Mục đích:** Bảng theo dõi toàn bộ phần việc còn lại của HRP V5/V6 từ vị trí hiện tại.
> **Nguồn authority:** `docs/UNIFIED_PLAN_v5.md`, `docs/aff_plan.md` và `docs/PLANNER_HANDOVER.md`.
> **Lưu ý:** File này là portfolio/checklist điều hành, không thay thế `TASK.md` của từng task.

## 0. Quy ước vận hành

- Mỗi thời điểm chỉ có **một Tier 2** và **một task code đang thực thi**.
- Tier 1 khảo sát và viết `TASK.md`; Tier 2 implement và viết `HANDOFF.md`; Tier 3 audit và viết `AUDIT.md`; Tier 1 resolve.
- Không giao Tier 2 trực tiếp từ file roadmap này. Chỉ giao khi task tương ứng đã có `TASK.md` ở trạng thái `READY_FOR_EXECUTION`.
- Không mở task mới trùng với phần đã được task cũ nghiệm thu; phải khảo sát residual trước.
- LIVE test chỉ chạy trên TEST DB an toàn. Thiếu môi trường là `ENV_BLOCKED`, không được ghi PASS giả.
- Universal Affiliate dùng `docs/aff_plan.md` làm design authority riêng, không dùng task Affiliate Portal legacy làm canonical.
- Owner override 28/08/2026: retire `/bcc`; Payroll/Payslip production thuộc ứng dụng lương riêng. `PAY-01..08` là `DEFERRED_FINAL`, không block HRP go-live.

### Ký hiệu

- `[x]`: đã ACCEPTED.
- `[ ]`: chưa hoàn thành.
- **CURRENT**: công việc hiện tại.
- **GATE**: cần quyết định hoặc dependency trước khi giao code.

## 1. Vị trí hiện tại

### Marketplace launch gate §7.9.7 — **CURRENT / PHASE_REVIEW**

- [x] `hrp-v5-m1-08-vendor-object-scope` — ACCEPTED.
- [x] `hrp-v5-m1-09a-current-field-projection` — ACCEPTED, commit `a49870e` đã push.
- [x] Prod DB đã remediation và ngang migration `main`.
- [ ] Owner review + staging drill `docs/runbooks/marketplace-launch-operations.md`.
- [ ] Owner publish một job thật và smoke authenticated/apply/tracking trên production.
- [ ] Owner rotate credential Neon đã lộ.
- [ ] Tier 1 khảo sát và viết contract OPS-06 cho rate-limit/file policy hardening; chỉ giao qua một Tier 2 stream sau khi contract PASS.

## 2. Khép Security Baseline M1

### [x] M1-09A — Current field-level projection

- Current schema/API surfaces đã có action-aware projection và contract test theo role/resource/action.
- `hrp-v5-m1-09a-current-field-projection` đã audit PASS và ACCEPTED.
- M1-09B cho `Payment`/`PaymentAllocation` được defer đến M8-06 vì schema canonical chưa có.

### [ ] M1-01 — AuthIdentity/account linking residual

- Hỗ trợ nhiều identity cho một User: password, OTP, Zalo hoặc provider được chấp nhận.
- Link/unlink identity phải có audit.
- Không dùng số điện thoại làm primary identity duy nhất.
- Tier 1 phải khảo sát schema và identity-core đã ACCEPTED trước khi mở task.

### [ ] M1-02 — Session và refresh-token rotation residual

- Session/refresh-token store và device metadata.
- Refresh rotation.
- Revoke một thiết bị hoặc tất cả thiết bị.
- Logout phải vô hiệu token/session cũ.
- Mở rộng identity-core hiện hữu, không viết lại auth/JWT/login.

### [ ] M1-03 — OTP baseline

- OTP chỉ lưu hash.
- Hết hạn sau khoảng thời gian đã chốt.
- Giới hạn số lần thử.
- Distributed rate limit.
- Response không được tiết lộ user có tồn tại hay không.

### [ ] M1-04 — Permission Pool v2 residual

- Custom permission group.
- User/group grant và revoke.
- Effective period, grantor và deny precedence.
- Permission version bump để revoke có hiệu lực ngay.
- Giữ ADMIN/ROOT invariant đã chấp nhận.
- Phần resolver/permission cơ bản đã có; chỉ mở task cho gap thật.

### [ ] M1-05 — Visibility Matrix residual

- Đối chiếu đủ 13 `SystemRole` × resource × action.
- MKT/SALE không đọc Worker PII.
- PM chỉ thấy project được phân công.
- DIRECTOR dùng đúng projection.
- Phần field projection còn thiếu phải gom vào M1-09, không mở task trùng.

### Gate đóng nhóm M1

- [ ] Tier 1 lập mapping: phần nào của M1-01..05 đã được task lịch sử ACCEPTED.
- [ ] Chỉ tạo task residual còn thiếu thật.
- [x] M1-08 và M1-09A ACCEPTED; M1-09B defer đúng dependency M8-06.
- [ ] Unit matrix và LIVE RLS/security matrix nhất quán.
- [ ] Không còn finding P0/P1 về auth, scope, IDOR hoặc projection.

## 3. Security, Observability và vận hành nền

### [ ] OPS-02 — Distributed cache/rate limit

- Redis/Upstash hoặc giải pháp tương đương.
- Counter dùng chung giữa nhiều instance.
- Session invalidation dùng chung.
- Không dùng `Map` in-memory cho security-critical path.

### [ ] OPS-04b — Observability integration

> OPS-04a foundation đã ACCEPTED; đây là phần tích hợp còn lại.

- Tích hợp Sentry/DataDog adapter qua observability foundation.
- Thay `console.error` ở route handlers bằng structured logger.
- Correlation/request ID xuyên suốt request và job.
- Log `durationMs` cho `/api/**`.
- Instrument cron/scheduled/background jobs.
- Dashboard latency, error rate và queue depth.
- Không để PII/secret lọt vào log.

### [ ] OPS-06 — Security hardening

- Security headers.
- CSRF và cookie flags.
- Pagination cap và bulk-export cap.
- Không Swagger/debug ở production.
- Signed URL TTL.
- Security checklist, IDOR test và bulk-dump test.

### [ ] OPS-05 — Backup/restore

- Daily Neon backup sang R2 hoặc target đã chốt.
- Retention/versioning tối thiểu 30 ngày.
- Restore branch định kỳ.
- Checksum, row count và smoke query sau restore.
- Chứng minh RPO/RTO bằng rehearsal thật.

## 4. Marketplace và Staffing residual

### [ ] M35-01b / RF-20 — Public slug

- Chốt dùng `publicSlug` riêng hoặc mapping stable tương đương.
- Nếu thêm cột: migration additive, backfill và unique constraint.
- Không tiếp tục coi mã project nội bộ là public URL contract mặc định.
- Hoàn thành trước khi affiliate link có optional job slug phụ thuộc public URL.

### [ ] M35-07 — Employment episode và AWOL

- `SUSPENDED` có resume.
- Terminated không sửa lịch sử.
- Vắng từ ba ngày tạo `AWOL_REVIEW`.
- Đóng/nhả quota có audit.
- Tái tuyển tạo episode mới.

### [ ] M35-08 — Dedup/merge workbench

- Chuẩn hóa SĐT/CCCD.
- Candidate key và merge queue.
- Trùng một khóa chỉ gợi ý, không auto-merge.
- Merge có audit và undo.
- Foreign key được chuyển an toàn.

### [ ] M35-09 / PORTAL-06 — PM Field App/PWA

- Offline queue.
- GPS evidence.
- Bulk transfer.
- Nút thao tác phù hợp field operation.
- PM chỉ thấy project được phân công.
- Conflict tạo ticket, không overwrite raw evidence.
- Phụ thuộc M7-04 và attendance write path.

## 5. Universal Affiliate V6

### [ ] AFF-00 — Design acceptance — **GATE**

- Founder chốt các proposed defaults/open decisions trong `aff_plan.md`.
- Chuyển design từ `DESIGN_REVIEW` sang `DESIGN_ACCEPTED`.
- Chốt generic data authority, migration strategy, RLS matrix và LIVE test architecture.
- Đưa `docs/aff_plan.md` chính thức vào Git sau khi được chấp nhận.
- Chỉ sau gate này Tier 1 mới tạo task AFF-01.

### [ ] AFF-01 — Universal identity và data foundation

- Mỗi User có một `affCode` opaque, stable và unique.
- Idempotent code issuance/backfill.
- Tạo `ReferralAttribution` canonical.
- Generic referrer relations cho submission/source/assignment.
- RLS, index, FK và audit vocabulary.
- Không thay public behavior trước khi flag được bật.

### [ ] AFF-02 — Link capture và shared self-service

- `/api/me/affiliate-link` dùng cho mọi User hợp lệ.
- `/r/:code` resolver.
- Signed attribution token/cookie.
- First valid source wins.
- TTL attribution theo quyết định AFF-00.
- Manual code chỉ là fallback khi không có attribution hợp lệ.
- Không trust raw `userId` hoặc beneficiary từ browser.

### [ ] AFF-03 — Public apply attribution boundary

- Apply nhận trusted attribution snapshot.
- Versioned SECURITY DEFINER RPC.
- Migration/grant/owner/search-path hardening.
- Idempotency và replay safety.
- Privacy/minimization.
- LIVE DB test bắt buộc.

### [ ] AFF-04 — Conversion, SourceClaim và Assignment propagation

- Giữ cùng nguồn từ Submission → SourceClaim → Worker → Assignment.
- Accepted-source conflict và referral guard.
- Conversion do HR có thể auto-accept source khi không conflict.
- Self-referral được apply nhưng commission-ineligible và có audit reason.
- Race-condition test.

### [ ] AFF-05 — Universal commission beneficiary

- Bất kỳ User nào cũng có thể là beneficiary, không chỉ CTV.
- Generic payout profile.
- Versioned commission policy và milestone.
- Một logical milestone chỉ tạo một credit đúng beneficiary.
- Approve, pay, reversal và debt.
- Phụ thuộc M6 và accounting decision gate.

### [ ] AFF-06 — Analytics và abuse hardening

- Click/conversion aggregates an toàn.
- Bot filtering và rate controls.
- Không lưu raw IP lâu dài.
- Privacy retention và alerts.
- Dashboard self-scope và dashboard lãnh đạo.
- Có thể chuẩn bị sau AFF-02 nhưng chỉ được đóng sau khi apply/convert/commission facts canonical.

### [ ] AFF-07 — Rollout, operations và cleanup

- Dark launch theo feature flag.
- Shadow attribution/commission.
- Controlled payout.
- Monitoring và rollback rehearsal.
- Chỉ cleanup compatibility path sau observation window và audit riêng.

## 6. Hạ tầng async trước Attendance

### [ ] OPS-01 — QStash foundation

- Verify signature.
- Job state canonical.
- Retryable/non-retryable classification.
- Idempotency.
- DLQ và watchdog.
- Owner escalation.

### [ ] OPS-03 — Outbox và notification handlers

- Email/SMS/Zalo adapter.
- Transactional outbox.
- Retry/backoff.
- Không acknowledge job khi handler chưa thành công.
- Có scheduler/queue trigger và backlog alert.

## 7. Attendance — M7

### [ ] M7-01 — Import qua presigned R2

- Direct upload.
- Magic bytes, size cap, row cap và checksum.
- Giữ file gốc và audit.

### [ ] M7-02 — Import job qua QStash

- `QUEUED/RUNNING/PARTIAL/COMPLETED/FAILED`.
- Chunk/continuation, retry và DLQ.
- Retry không tạo duplicate.

### [ ] M7-03 — Mapping và unmatched workbench

- Column mapping theo vendor/site.
- Normalize worker code.
- Error taxonomy và suggested fix.
- Retry từng dòng hoặc batch.

### [ ] M7-04 — Hai nguồn AttendanceEvent

- File vendor và GPS/PM cùng ghi raw `AttendanceEvent`.
- Raw evidence bất biến.
- Precedence/conflict rõ.
- Lưu source và confidence.

### [ ] M7-05 — Check-in write path chịu tải

- Spike 5.000 request.
- Không trả thành công giả.
- Nếu async: receipt và status polling.
- `QUEUED → APPENDED/FAILED`.

### [ ] M7-06 — Timezone, ca đêm và ngày lễ

- `work_date` theo Việt Nam.
- Ca đêm thuộc ngày bắt đầu theo rule canonical.
- Holiday split sau 00:00.
- Golden tests UTC/VN, 22:00–06:00 và OT.

### [ ] M7-07 — Timesheet approve/lock/correction

- Raw event → normalized line → period.
- Record LOCKED bất biến.
- Correction tạo adjustment liên kết version cũ.

### [ ] M7-08 — Attendance Exception Workbench UI

- Master-detail.
- Resolve drawer.
- Locked read-only.
- Import progress/error state.
- Bulk action có confirm và audit.

## 8. Billing và Reconciliation — M8

### [ ] M8-01 — Effective-dated rate card

- Rate theo site/slot/shift/day category.
- Effective period và no-overlap.
- Approval, currency, unit và rounding.
- Snapshot rate vào statement line.

### [ ] M8-02 — Vendor payable và client billing

- Hai statement độc lập.
- Vendor resolve từ assignment/order/contract canonical.
- Client resolve từ project contract.
- Không dùng `findFirst()` mơ hồ để suy vendor.

### [ ] M8-03 — Statement lineage

- Trace raw attendance → timesheet → rate → statement line → total.
- Snapshot timesheet/rate/formula/input version.

### [ ] M8-04 — Decimal-safe hours và BigInt money

- Không `Number()`/`Math.round()` không an toàn trên giờ và tiền.
- Làm tròn sau phép nhân theo ADR.
- Golden cases 7.5h, 0.25h và OT.
- Hấp thụ RF-14, không mở task trùng.

### [ ] M8-05 — Revision/dispute workflow canonical

- `DRAFT → ISSUED → CONFIRMED/DISPUTED → REVISED → LOCKED`.
- Revision có `supersedesId`.
- Không sửa statement đã phát hành tại chỗ.
- Tối đa hai vòng dispute.
- FORCE_LOCK cần reason/permission.
- Migrate vocabulary cũ theo kế hoạch, không lẫn `PAID` vào statement state.

### [ ] M8-06 — Payment sub-ledger

- `Payment` và `PaymentAllocation`.
- Partial payment.
- Refund/reversal.
- Outstanding không âm.
- Tách payment state khỏi statement state.

### [ ] M8-07 — Reconciliation UI

- Margin comparison.
- Lineage drawer.
- Vendor dispute form.
- Empty/locked states.
- Vendor không thấy margin/client rate.

### [ ] M8-08 — Client confirmation

- PDF/link token one-time và expiry.
- Manual accounting confirmation có audit.
- Auto-confirm chỉ sau SLA đã chốt.

## 9. Commission — M6

### [ ] M6-01 — Commission group/policy

- Commission group và membership.
- Policy version/effective period.
- Cap và milestone.
- Không hard-code policy trong route.

### [ ] M6-02 — Individual override

- Override theo worker/referrer.
- Reason, valid period, creator và approver.
- Permission và maker-checker theo ngưỡng.

### [ ] M6-03 — Permission assignment

- Gán permission cho user hoặc custom group.
- Deny precedence, expiry và version bump.
- Audit grant/revoke.

### [ ] M6-04 — Commission calculation inputs

- Hours, assignment, accepted milestone và revenue snapshot.
- Policy ID/version trong ledger line.
- Replay được từ input snapshot.

### [ ] M6-05 — Revenue commission

- `PERCENT_OF_REVENUE` chỉ bật khi client revenue canonical.
- Feature flag fail-closed nếu revenue chưa sẵn sàng.
- Không trả số giả.

### [ ] M6-06 — Reversal/netting/debt

- Reversal ledger.
- Commission debt và carry-forward.
- Settlement report.
- Không âm số dư ngầm.

### [ ] M6-07 — Commission dashboard/UI

- Ledger theo kỳ.
- Pending/approved/paid.
- Policy explanation và override history.
- Self-scope.

## 10. Payroll — PAY — **DEFERRED_FINAL / KHÔNG BLOCK GO-LIVE**

> Không mở task PAY trong chuỗi core hiện tại. HRP giữ Attendance/Billing/Commission và contract tích hợp; ứng dụng lương riêng tiếp tục sở hữu tính lương và xem lương production. Chỉ tái đánh giá phần này sau M9 + core UAT/cutover và khi Founder quyết định mở lại.

### [ ] PAY-01 — PayRun schema

- PayRun, worker result, earning/deduction line và payslip snapshot.
- Unique worker/kỳ.
- Typed state và optimistic lock.

### [ ] PAY-02 — Hours breakdown snapshot

- Snapshot nhóm giờ từ timesheet/assignment.
- Replay được input tại thời điểm calculate.

### [ ] PAY-03 — Effective-dated payroll config

- Payroll config và tax bracket version.
- Resolve theo `asOfDate`.
- Không fallback silently sang hard-code.

### [ ] PAY-04 — Statutory calculator contract

- Adapter `DEFERRED`, `MANUAL` và test-only mode phù hợp.
- Production fail-closed.
- Deferred/test mode không được LOCK payroll thật.

### [ ] PAY-05 — Gross payroll shell và dry-run

- Gross, allowance, overtime và manual deduction.
- QStash chunking.
- Idempotent retry.
- Finalize transaction ngắn.

### [ ] PAY-06 — Canonical payslip

- Payslip snapshot bất biến.
- API self-scope cho Worker.
- PDF chỉ là projection.

### [ ] PAY-07 — TNCN/BHXH thật — **ACCOUNTING GATE**

- Progressive PIT, BHXH rules, dependent/NPT và 14-day rule.
- Ít nhất mười golden cases kế toán.
- Chạy song song hai kỳ.
- Accountant sign-off trước LOCK.

### [ ] PAY-08 — Compliance forms/reporting — **ACCOUNTING GATE**

- Mẫu thuế/BHXH và quyết toán.
- Version pháp lý và feature flag.
- Không block payroll shell/MVP.

## 11. Performance và background operations

### [ ] OPS-07 — Load/performance

- Burst 5.000 check-in.
- Dataset 20.000 worker.
- Pool exhaustion.
- `EXPLAIN` scope queries.
- SLO được đo và lưu.

### [ ] Background operations residual

- Outbox drain.
- Dispute auto-confirm.
- Khóa chống cron chạy chồng.
- Alert khi backlog tăng.
- Gom vào OPS-03/04b/07, không tạo namespace trùng.

## 12. HRM nội bộ — M9, làm sau core

### [ ] M9-01 — Employee model/actor type

- Tách Employee nội bộ khỏi Worker outsourcing.
- Tái sử dụng ticket engine mà không ép `Ticket.workerId`.

### [ ] M9-02 — Employee CRUD và org chart

- Legal entity, department, manager, position và episode.
- Không trộn scope với Worker outsourcing.

### [ ] M9-03 — Leave workflow

- Leave request, balance và approval.
- Transition, audit và optimistic concurrency.

### [ ] M9-04 — HR profile/performance

- Hồ sơ, KPI vận hành, review và attachment.
- KPI dùng policy/config, không hard-code công thức cũ.

## 13. UAT và Cutover cuối

- [ ] Security matrix đủ 13 role.
- [ ] Vendor/client/worker IDOR tests.
- [ ] Bulk-export/bulk-dump security tests.
- [ ] Import lỗi, retry, duplicate, watchdog và DLQ.
- [ ] Concurrency activate/transfer/lock/reversal.
- [ ] Golden tests tiền, giờ, statement và commission; smoke contract tích hợp với ứng dụng lương riêng.
- [ ] Shadow accounting hai kỳ.
- [ ] Load test và pool exhaustion.
- [ ] Backup/restore rehearsal.
- [ ] Cutover runbook.
- [ ] Rollback runbook.
- [ ] Owner escalation matrix.
- [ ] Không còn finding P0/P1 chưa có owner/closure.

## 14. Thứ tự thực hiện đề xuất cho một Tier 2

```text
M1-08
→ M1-09
→ khảo sát và đóng residual M1-01..05
→ OPS-02 → OPS-04b → OPS-06 → OPS-05
→ M35-01b → M35-07 → M35-08
→ AFF-00 → AFF-01 → AFF-02 → AFF-03 → AFF-04
→ OPS-01 → OPS-03
→ M7-01..08
→ M35-09 / PORTAL-06
→ M8-01..08
→ M6-01..07
→ AFF-05 → AFF-06 → AFF-07
→ OPS-07
→ M9-01..04
→ core UAT / cutover
→ PAY-01..08 chỉ khi Founder mở lại lane DEFERRED_FINAL
```

## 15. Mốc dự kiến nếu giữ tốc độ hiện tại

| Mốc | Ước lượng |
|---|---:|
| Security baseline + residual M1 | 4–6 tuần |
| Marketplace residual + AFF-01..04 | thêm 5–8 tuần |
| Attendance M7 | thêm 5–8 tuần |
| Billing M8 | thêm 5–7 tuần |
| Commission M6 + Affiliate GA | thêm 4–6 tuần |
| M9 và core UAT/cutover | thêm 4–7 tuần |
| Payroll PAY-01..08 | ngoài baseline; chỉ ước lượng lại khi Founder mở lane |

Ước lượng tổng thể với một Tier 2:

- Marketplace + Affiliate acquisition dùng được: khoảng **2,5–3,5 tháng**.
- Core outsourcing gồm Attendance/Billing/Commission: khoảng **6–8 tháng**.
- HRP core production-ready (không gồm Payroll riêng): khoảng **8–11 tháng**.
- Payroll không nằm trong baseline HRP; thời gian của ứng dụng lương riêng được quản lý ở roadmap khác.

## 16. Cách cập nhật file này

Khi một task được Tier 1 resolve `ACCEPTED`:

1. Đổi checkbox tương ứng từ `[ ]` thành `[x]`.
2. Không chép toàn bộ audit evidence vào file này; evidence nằm trong `TASK.md`, `HANDOFF.md`, `AUDIT.md`.
3. Cập nhật “Vị trí hiện tại” sang task kế tiếp đã có contract.
4. Nếu roadmap thay đổi dependency hoặc product decision, sửa nguồn authority trước rồi mới cập nhật checklist này.
5. Không đánh dấu hoàn thành chỉ vì code đã commit; task phải qua audit và Tier 1 resolve.
