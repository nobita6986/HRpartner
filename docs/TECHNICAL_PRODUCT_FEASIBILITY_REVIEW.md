# BÁO CÁO ĐÁNH GIÁ KHẢ THI KỸ THUẬT, PHƯƠNG HƯỚNG VÀ TÍNH NĂNG HRP

> **Ngày đánh giá:** 14/08/2026  
> **Tài liệu nguồn:** `docs/UNIFIED_PLAN_v2.md` (v2.1)  
> **Phạm vi:** Kiến trúc, code, dữ liệu nghiệp vụ, phương hướng sản phẩm, nguồn lực triển khai và giá trị tính năng.  
> **Ngoài phạm vi tạm thời:** Pháp lý, BHXH và thuế TNCN theo yêu cầu của stakeholder.

---

## Kết luận điều hành

Dự án **khả thi về công nghệ và có giá trị nghiệp vụ rõ ràng**, nhưng chưa nên triển khai trực tiếp theo schema và thứ tự module hiện tại.

Các quyết định nền tảng như một ứng dụng Next.js, modular monolith, PostgreSQL/Prisma, PWA trước và xử lý nền bằng queue phù hợp với team 5 dev. Điểm nghẽn chính không nằm ở lựa chọn công nghệ mà nằm ở:

1. Mô hình trạng thái người lao động đang trộn nhiều vòng đời khác nhau.
2. Dữ liệu chấm công chưa hỗ trợ đầy đủ nhiều ca, nhiều log và quy trình duyệt/khóa.
3. Payroll đang đặt ở cấp `worker + project + tháng`, dễ tính lặp các khoản cấp người lao động khi chuyển dự án.
4. Rate card chưa tách giá mua từ vendor và giá bán cho khách hàng.
5. Roadmap đang portal-first trong khi định vị mới là ERP vận hành nội bộ trước.

Repository tại thời điểm đánh giá chưa có code ứng dụng thực tế. Hiện chỉ có trang giới thiệu `index.html` và tài liệu; chưa có `package.json`, `src/`, Prisma schema, migrations hay test suite. Vì vậy phần “đánh giá code” trong báo cáo tập trung vào các đoạn code mẫu, schema dự kiến và khả năng chuyển thiết kế thành code an toàn.

Hướng triển khai đề xuất là xây một vertical slice nội bộ theo chuỗi:

`Khách hàng/Dự án → Nhu cầu tuyển → Worker → Assignment → Nhập & chốt công → Đối soát`

Sau khi luồng này vận hành ổn định mới mở rộng Worker Portal, Vendor Portal, CTV Portal, Zalo và payroll hoàn chỉnh.

---

## 1. Tổng quan và chấm điểm khả thi

| Trục đánh giá | Điểm | Nhận xét |
|---|---:|---|
| Kiến trúc ADR | **8/10** | Next.js modular monolith, PostgreSQL/Prisma, PWA và queue phù hợp team 5 dev. Không cần microservices. |
| Mức sẵn sàng code | **2/10** | Code sản phẩm chưa bắt đầu; các đoạn code trong kế hoạch mới là minh họa và có một số lỗi biên dịch/logic. |
| Thiết kế dữ liệu nghiệp vụ | **5/10** | Đúng khái niệm master worker và assignment, nhưng status, nguồn tuyển, chấm công, payroll và rate card đang đặt sai cấp dữ liệu. |
| Phương hướng sản phẩm | **6/10** | Đang định vị “ERP nội bộ trước” nhưng roadmap vẫn portal-first và trải rộng M1–M10. Nên chuyển sang operations-first. |
| Timeline/team 5 dev | **5/10** | 470 MD / 20 MD mỗi tuần là khoảng 24 tuần danh nghĩa, chưa có buffer. Production-ready 2–3 tháng chỉ khả thi cho MVP đã cắt mạnh. |
| Giá trị nghiệp vụ | **8/10** | Worker master, assignment, chốt công, đối soát và payroll là bộ tính năng có ROI rõ ràng. |

### 1.1. Đánh giá các ADR

| ADR | Kết luận | Điều chỉnh đề xuất |
|---|---|---|
| ADR-001 — Next.js Route Handlers | **Giữ** | Phù hợp team nhỏ và một deployment. Business logic không được nằm trực tiếp trong route handler. |
| ADR-002 — Modular monolith | **Giữ** | Đây là lựa chọn đúng. Cần enforce dependency bằng ESLint boundary và test domain. |
| ADR-003 — Một app, vendor subdomain | **Giữ có sửa** | Dùng một domain chính và vendor subdomain. Không hứa chia sẻ session giữa hai registrable domain khác nhau. |
| ADR-004 — PostgreSQL + Prisma | **Giữ** | Phù hợp transaction, báo cáo và dữ liệu có quan hệ. Các constraint phức tạp có thể dùng raw SQL migration. |
| ADR-005 — Ba giai đoạn hạ tầng | **Giữ về hướng kỹ thuật** | Chuyển self-host theo tải thực tế và năng lực vận hành, không theo deadline cố định. |
| ADR-006 — Storage abstraction | **Giữ abstraction** | Báo cáo này không đánh giá lựa chọn nhà cung cấp theo pháp lý. Domain code chỉ gọi storage interface. |
| ADR-007/007b — OTP + Zalo | **Sửa** | OTP là baseline bắt buộc. Zalo là feature flag; không được block MVP. Dùng identity-linking thay vì upsert mù theo SĐT. |
| ADR-008 — PWA trước | **Giữ** | PWA phù hợp. Capacitor chỉ kích hoạt khi có vấn đề đo được với PWA. |
| ADR-009 — QStash | **Giữ** | Dùng cho batch/retry; vẫn cần job state, idempotency và input snapshot trong DB. |
| ADR-010 — Decimal VND | **Giữ, sửa implementation** | Không chuyển tiền sang JavaScript `number`; dùng Decimal hoặc số nguyên VND xuyên suốt. |

### 1.2. Timeline thực tế

ko đánh giá

## 2. Điểm nghẽn và nợ kỹ thuật

Các mục được sắp xếp theo mức độ nghiêm trọng giảm dần.

| Nợ/điểm nghẽn | Mức độ | Giai đoạn bùng phát | Cách phòng tránh ngay từ đầu |
|---|---|---|---|
| Payroll lưu theo `worker + project + tháng` | **P0** | M8, khi worker chuyển dự án trong tháng | Tạo `pay_run` và một kết quả/người/kỳ; earnings phân bổ theo assignment, khoản cấp người chỉ tính một lần. |
| `WorkStatus` trộn duyệt hồ sơ, availability, assignment, nghỉ việc và blacklist | **P0** | M5 ngay Phase 1b | Tách `profileStatus`, `candidateStatus`, `employmentStatus`, `assignmentStatus`, `riskFlag`; availability được suy ra. |
| Attendance ép một dòng/người/dự án/ngày | **P0** | M7 khi có nhiều ca, nhiều log hoặc chỉnh công | Dùng ba tầng: raw events bất biến → timesheet chuẩn hóa → bảng công đã duyệt/khóa. |
| Một rate card dùng chung vendor payable và client billing | **P0** | M8 đối soát/công nợ | Tách bảng giá mua từ vendor và giá bán client; version theo thời gian, vị trí, ca và loại công. |
| `sourceType`, `employmentType`, `workSetting` nằm trên Worker | **P0** | Khi tái tuyển, đổi nguồn hoặc chuyển loại hợp tác | Worker chỉ giữ master data; nguồn nằm ở `submission/source_claim`, quan hệ và work setting nằm ở contract/assignment có hiệu lực thời gian. |
| Một assignment active duy nhất nhưng UI nói worker có thể làm nhiều dự án | **P0** | Điều động, tính công và KPI | Chốt quy tắc một hay nhiều assignment; dùng khoảng thời gian nửa mở `[from,to)` và bỏ đồng bộ kép `isActive + endDate`. |
| Scope 470 MD nhưng công bố production-ready 2–3 tháng | **P0 — tổ chức** | Sprint 3–4 | Định nghĩa lại production-ready: MVP nội bộ 10–12 tuần; full M0–M9 khoảng 6–8 tháng. |
| Vendor portal tạo Worker trực tiếp | **P0 — dữ liệu** | Khi trùng SĐT/CCCD hoặc nhiều nguồn gửi cùng người | Vendor tạo `candidate_submission`; HR review/merge rồi mới tạo hoặc liên kết Worker. |
| Middleware mẫu không chạy đúng vendor subdomain | **P1** | M4 | `ALLOWED_DOMAINS` thiếu vendor subdomain, dùng sai `request.pathname`, hai ví dụ rewrite không thống nhất; thêm integration test hostname. |
| Quota được tăng ngoài transaction tạo assignment | **P1** | Dự án tuyển nóng hoặc client retry | Tạo assignment và cập nhật quota trong cùng transaction/idempotency key; giảm quota khi kết thúc. |
| Code payroll dùng `.toNumber()` | **P1** | M8 | Dùng Decimal hoặc số nguyên VND xuyên suốt; đặt rounding policy tại một domain service. |
| Code KPI có hai khóa `OR` và `referrerId` chưa khai báo | **P1** | Khi bắt đầu M8 | Viết lại query, không copy code mẫu hiện tại; thêm compile check và golden test. |
| Upsert Zalo theo số điện thoại giả định luôn lấy được số | **P1** | M1 khi user dùng nhiều kênh login | Tạo `auth_identities` và explicit account linking; refresh session có rotation và revoke. |
| Idempotency key chỉ có một khóa toàn cục | **P1** | API retry, nhiều user dùng cùng key | Khóa theo `(actorId, route, key)` và lưu request hash; không trả response của actor khác. |
| Monitoring và data isolation hoàn thiện quá muộn | **P1** | Phase 1b khi mở vendor access | Logging, audit, alert tối thiểu và test scope phải có từ M0; không chờ Phase 2. |
| Source ownership chỉ có `ownerId/assignedToId` | **P1 — nghiệp vụ** | Khi nhân viên nghỉ hoặc bàn giao pool | Scope theo team/branch/assignment; có cơ chế delegate và handover có audit. |
| Commission unique theo `ctv + worker + tháng` | **P1** | Có nhiều milestone hoặc điều chỉnh | Dùng commission ledger theo assignment/policy/milestone; adjustment bằng dòng đảo, không overwrite. |
| Contract dùng `party_id` đa hình nhưng không có FK thật | **P1 — dữ liệu** | M3/M8 báo cáo hợp đồng | Dùng contract parties/junction hoặc các FK typed; thêm project/scope và annex/version. |
| PDF import được quảng bá như dữ liệu cấu trúc | **P2** | M7 UAT | MVP chỉ nhận XLSX/CSV. PDF chỉ lưu attachment hoặc xử lý thủ công cho đến khi có nhu cầu đủ lớn. |
| Card/List bắt buộc trên mọi màn | **P2 — scope** | Tất cả sprint frontend | Card cho directory/mobile; table cho BCC, payroll, reconciliation và audit. |
| M10 mockup được tính 30 MD | **P2 — scope** | Phase 3 | Bỏ khỏi horizon; nếu cần chỉ làm prototype 3–5 MD sau go-live. |
| Profile caching 1 giờ | **P2 — kỹ thuật** | Khi sửa hồ sơ và phân quyền | Không cache profile ở quy mô hiện tại. Redis chỉ dùng OTP/rate limit/job board cho đến khi metrics chứng minh cần cache. |

### 2.1. Các lỗi code mẫu cần sửa trước khi scaffold

1. `request.pathname` trong middleware phải lấy từ `request.nextUrl.pathname`.
2. `vendor.hrpartner.vn` bị chặn bởi `ALLOWED_DOMAINS` trước khi tới nhánh rewrite.
3. Rewrite sang `/(vendor)` không nhất quán với ví dụ sau dùng `/vendor`; route group không phải URL segment nghiệp vụ.
4. Cookie `.hrpartner.vn` không thể chia sẻ trực tiếp với `hrpvietnam.vn`; nên redirect về canonical domain.
5. `calculateKPIForManager()` có hai thuộc tính `OR` trong cùng object và tham chiếu `referrerId` chưa khai báo.
6. `attendance.length` không thể đại diện `totalDays` khi có nhiều log/ca.
7. `.toNumber()` phá mục tiêu Decimal của ADR-010.
8. `endDate = transferDate` và assignment mới bắt đầu cùng `transferDate` tạo overlap nếu cả hai đầu mút đều inclusive.
9. Tăng `project.filled` nhưng chưa tạo assignment cùng transaction có thể để lại quota ảo.
10. Nhận mọi timestamp offline trong 24 giờ mà không đánh dấu độ tin cậy tạo lỗ hổng vận hành; cần `capturedAt`, `receivedAt`, risk flag và exception review.

---

## 3. Điều chỉnh tính năng hiện có

| Tính năng | Giữ/Bỏ/Sửa/Thêm | Lý do | Module liên quan |
|---|---|---|---|
| Modular monolith + PostgreSQL | **GIỮ** | Đủ tải mục tiêu, dễ vận hành cho team nhỏ | M0 |
| Observability, audit, feature flags | **SỬA** | Đưa bản tối thiểu vào Sprint 1, không để Phase 2 | M0 |
| OTP/Zalo/device binding | **SỬA** | OTP luôn hoạt động; Zalo optional; device binding chỉ áp dụng thao tác nhạy cảm | M1 |
| Worker profile | **GIỮ** | Là master data cốt lõi, nhưng phải có completion state và edit history | M2, M5 |
| Job board/quick apply | **GIỮ nhưng đổi thứ tự** | Có giá trị thu hút nguồn, nhưng không nên đi trước backbone vận hành | M2, M3 |
| GPS/selfie | **SỬA** | Chỉ là evidence quản lý; thêm assignment/site, thời điểm server nhận và exception state | M2, M7 |
| Project CRUD/Kanban | **SỬA** | Thêm `staffing_order/job_position`; Kanban có thể thay bằng list trong MVP | M3 |
| Staffing order/job position | **THÊM** | Project không đủ biểu diễn nhu cầu theo vị trí, ca, số lượng, thời gian và điều kiện | M3 |
| Vendor nhập trực tiếp thành Worker | **SỬA** | Vendor tạo `candidate_submission`; HR duyệt/merge rồi mới sinh Worker | M4, M5 |
| Vendor reconciliation workflow | **THÊM** | Cần `DRAFT → SENT → DISPUTED → CONFIRMED → LOCKED → PAID`, có adjustment | M4, M8 |
| Talent Pool dedup/merge | **THÊM** | Chuẩn hóa SĐT/CCCD, merge queue, lịch sử nguồn và ownership | M5 |
| Vòng đời Worker một enum | **BỎ** | `CHODUYET → NGHIVIEC` khi từ chối hồ sơ sai nghĩa; phải tách các state machine | M5 |
| Commission CTV theo giờ mặc định | **SỬA** | MVP dùng PER_HEAD theo milestone; ledger hỗ trợ cap, reversal và adjustment | M6 |
| Import Excel/CSV | **GIỮ** | Preview, mapping template, unmatched queue và idempotent re-import là lõi | M7 |
| Import PDF | **BỎ khỏi MVP** | PDF không phải nguồn dữ liệu cấu trúc ổn định, khó kiểm tra và tự động hóa | M7 |
| Webhook máy chấm công | **BỎ khỏi MVP** | Hướng sản phẩm mới đã chọn import file; chỉ giữ adapter interface cho tương lai | M7 |
| Hai luồng chấm công | **GIỮ có sửa** | GPS là evidence; Excel/CSV hoặc machine event là nguồn hình thành timesheet, nhưng tất cả phải qua approve/lock | M2, M7 |
| Payroll/Payslip | **SỬA LỚN** | Một pay result/người/kỳ, earning lines theo assignment, snapshot, version và adjustment | M8 |
| Vendor payable và client receivable | **THÊM và tách riêng** | Hai nghĩa vụ tài chính khác nhau, không dùng chung statement/rate card | M8 |
| KPI “1 giờ = 1 điểm” | **BỎ** | Tách KPI vận hành khỏi hoa hồng: fill-rate, show-up, retention, attendance completeness | M3, M6, M8 |
| Card/List trên mọi màn | **SỬA** | Card cho Talent Pool/Project/mobile; table cho BCC, payroll và reconciliation | M0–M8 |
| M9 HRM | **GIỮ sau core** | Không để CRUD nhân viên nội bộ làm chậm luồng cung ứng/chốt công | M9 |
| M10 Assets 30 MD | **BỎ khỏi horizon** | Không tạo giá trị cho go-live; prototype ngắn sau khi core ổn định | M10 |
| Multi-tenant | **BỎ khỏi MVP** | Sản phẩm đang là ERP nội bộ; chỉ thêm tenant isolation khi có pilot SaaS thật | M0–M9 |
| PWA | **GIỮ** | Phù hợp nhóm người dùng và tiết kiệm chi phí mobile | M2 |
| Capacitor/native packaging | **HOÃN** | Chỉ làm khi metrics cho thấy PWA không đáp ứng push, camera hoặc reliability | M2 |

### 3.1. Mô hình vòng đời đề xuất

Không dùng một `WorkStatus` duy nhất. Nên tách tối thiểu:

```text
profile_status:
  INCOMPLETE → PENDING_VERIFY → VERIFIED | REJECTED

submission_status:
  NEW → SCREENING → QUALIFIED | REJECTED | WITHDRAWN | MERGED

employment_status:
  NONE → ACTIVE → SUSPENDED | TERMINATED

assignment_status:
  PLANNED → ACTIVE → PAUSED | ENDED | TRANSFERRED | CANCELLED

risk_status:
  NORMAL → REVIEW → BLOCKED
```

`AVAILABLE`, `ALLOCATED`, `PARTIALLY_ALLOCATED` nên được suy ra từ assignment/schedule thay vì lưu như nguồn sự thật độc lập.

### 3.2. Mô hình chấm công đề xuất

```text
attendance_events
  - Dữ liệu raw bất biến từ file, máy, GPS hoặc manual event
  - external_event_id, source, captured_at, received_at, payload_hash

timesheet_lines
  - Dữ liệu đã chuẩn hóa theo ngày/ca/assignment
  - giờ thường, OT theo loại, phụ cấp, exception

timesheet_periods
  - Kỳ bảng công và workflow PENDING/REVIEWED/APPROVED/LOCKED
  - version, approved_by, locked_at, adjustment_of
```

Mọi chỉnh sửa sau khi khóa phải tạo adjustment, không sửa trực tiếp dữ liệu đã dùng để tính tiền.

### 3.3. Mô hình payroll và đối soát đề xuất

```text
pay_runs
  - legal_entity/payroll_group, period, version, status

worker_pay_results
  - một kết quả/người/kỳ

earning_lines
  - phân bổ theo assignment/project/rate version

deduction_lines
  - khoản cấp người, chỉ tính một lần trong kỳ

payslips
  - snapshot đã phát hành cho worker

vendor_statements / vendor_statement_lines
  - công được duyệt × vendor pay rate

client_statements / client_statement_lines
  - công được duyệt × client bill rate
```

Không overwrite pay run hoặc statement đã khóa. Sai lệch được xử lý bằng version mới hoặc adjustment line.

### 3.4. Thứ tự module đề xuất

Thứ tự hiện tại nên đổi từ portal-first sang operations-first:

1. **M0 + M1:** nền tảng, auth nội bộ, RBAC, audit, CI/CD.
2. **M3 + M5:** client/project/staffing order, worker master, submission, assignment.
3. **M7:** import, mapping, review, approve, lock bảng công.
4. **M8 tối giản:** rate version, vendor/client statement, export.
5. **M2:** worker profile, job board, attendance/payslip view.
6. **M4:** vendor submission và confirm/dispute statement.
7. **M6:** CTV portal và commission ledger.
8. **M8 hoàn chỉnh:** pay run, payslip, adjustment, reports.
9. **M9:** HRM nội bộ.
10. **M10:** ngoài horizon.

---

## 4. Tính năng mở rộng post-go-live

### 4.1. Ngắn hạn — 0 đến 3 tháng

| Tính năng | Giá trị | Điều kiện kích hoạt |
|---|---|---|
| Dedup/merge dashboard | Giảm hồ sơ trùng và tranh chấp nguồn | Bắt đầu có nhiều kênh nhập cùng worker |
| Unmatched attendance queue | Giảm thời gian dò mã nhân viên | Import thực tế có dòng không map được |
| Ticket sai công/đối soát | Tập trung exception thay cho chat thủ công | Đã có bảng công/payslip hiển thị cho user |
| Vendor confirm/dispute | Khóa số liệu hai bên có audit | Nội bộ đã tạo statement ổn định hai kỳ |
| Adjustment kỳ sau | Không sửa dữ liệu đã khóa | Đã phát sinh correction sau kỳ chốt |
| Dashboard show-up/no-show | Giúp HR/PM phản ứng sớm | Assignment và attendance đạt độ đầy đủ tối thiểu |
| Data-quality dashboard | Theo dõi thiếu SĐT, mã NV, ngân hàng, assignment | Có trên 500 worker active |

Điều kiện chung: đã chạy ổn ít nhất hai kỳ, unmatched dưới 3% và có owner chịu trách nhiệm xử lý exception.

### 4.2. Trung hạn — 6 đến 12 tháng

| Tính năng | Giá trị | Điều kiện kích hoạt |
|---|---|---|
| Worker-job matching | Rút ngắn thời gian tìm nguồn | Có lịch sử assignment/ứng tuyển đủ sạch |
| Vendor scorecard | Đo chất lượng nguồn theo fill/show-up/retention | Có ít nhất 3–6 tháng dữ liệu vendor |
| Staffing forecast | Dự báo thiếu hụt theo project/ca | Staffing order và assignment được sử dụng nhất quán |
| Bank payout export | Giảm thao tác thanh toán thủ công | Pay run ổn định và bank data đủ sạch |
| Client billing/AR workflow | Theo dõi từ timesheet tới invoice/payment | Client rate card và statement đã chuẩn hóa |
| Automation Zalo/SMS | Nhắc ca, hồ sơ thiếu, statement, payslip | Notification preference và template ổn định |
| CTV self-service | Giảm hỏi trạng thái/hoa hồng | Commission ledger chạy đúng ít nhất ba kỳ |

Điều kiện chung: có tối thiểu sáu tháng dữ liệu sạch hoặc khoảng 5.000 assignment history và quy trình rate/approval không còn thay đổi lớn.

### 4.3. Dài hạn

| Tính năng | Điều kiện kích hoạt |
|---|---|
| Multi-tenant SaaS | ERP nội bộ ổn định ít nhất sáu tháng và có khách hàng pilot trả tiền |
| Adapter máy chấm công | Có ít nhất hai site cần cùng loại integration và cung cấp protocol ổn định |
| Native app/Capacitor | PWA có vấn đề đo được về push, camera, offline hoặc reliability |
| AI matching/no-show prediction | Có dữ liệu nhãn đủ lớn, chất lượng và outcome rõ ràng |
| Data warehouse/BI | Báo cáo vận hành ảnh hưởng hiệu năng OLTP hoặc cần kết hợp nhiều nguồn |
| Dynamic pricing/margin optimization | Client/vendor rate, attendance và cost allocation đã chuẩn hóa |

---

## 5. Top 5 hành động ưu tiên trước khi code

### 1. Chốt lại MVP nội bộ 10–12 tuần

MVP chỉ gồm:

`Project/Staffing Order → Worker → Assignment → Import/Approve Timesheet → Reconciliation Export`

Phải đồng bộ lại `index.html`, `UNIFIED_PLAN_v2.md`, WBS và định nghĩa “production-ready”. Không dùng cùng lúc các mốc 6 tuần, 2–3 tháng và 470 MD mà không phân biệt phạm vi.

### 2. Thu thập dữ liệu và quy trình thật ngay Sprint 0

Tối thiểu cần:

- Ba file chấm công từ các đối tác có format khác nhau.
- Hai kỳ đối soát thực tế đã được kế toán xác nhận.
- Rate card mua từ vendor và bán cho client.
- Ít nhất 20 trường hợp vòng đời worker: trùng hồ sơ, đổi nguồn, chuyển dự án, tạm nghỉ, quay lại.
- Các case assignment trong cùng tháng và correction sau chốt.

Không thiết kế import, payroll hoặc reconciliation chỉ dựa trên file mẫu tự tạo.

### 3. Thiết kế lại sáu aggregate trước Prisma

Phải chốt invariants và ownership cho:

1. `Worker`
2. `Submission/SourceClaim`
3. `Assignment`
4. `Attendance/Timesheet`
5. `PayRun`
6. `VendorStatement/ClientStatement`

Schema Prisma chỉ được tạo sau khi các aggregate, state transition và effective-date rule được stakeholder duyệt.

### 4. Làm hai technical spike trong tuần đầu

**Spike A — Attendance import:**

- Hai format Excel thực tế.
- Upload → mapping → preview → unmatched → approve → lock.
- Re-import idempotent và có audit.

**Spike B — Calculation/reconciliation:**

- Đọc approved timesheet snapshot.
- Áp rate version đúng hiệu lực.
- Tạo statement và export.
- Golden test cho chuyển dự án, nhiều ca, correction và adjustment.

Hai spike này quyết định tính khả thi tốt hơn việc làm trước landing page hoặc Kanban.

### 5. Khởi tạo engineering foundation có kiểm soát

Ngay Sprint 1 cần có:

- Next.js/TypeScript strict mode.
- Prisma migrations và migration check trên CI.
- Seed data theo scenario thật.
- Domain-boundary lint.
- Unit/integration/E2E skeleton.
- RBAC và data-scope integration tests.
- Audit log và monitoring tối thiểu.
- Feature flags cho Zalo, vendor portal, GPS và commission.
- Một vertical slice end-to-end deploy được.

---

## 6. Ý kiến chuyên gia cho từng mục `[CẦN CHỐT]`

| # | Mục cần chốt | Khuyến nghị |
|---:|---|---|
| 1 | Hãng/protocol máy chấm công | **Không tích hợp máy trong MVP.** Đóng open question này; chỉ mở lại khi có ít nhất hai site dùng cùng protocol. |
| 2 | Chính sách hoa hồng CTV | Dùng **PER_HEAD theo milestone** trong MVP: bắt đầu làm và duy trì đủ số ngày. Policy có version, cap và reversal. |
| 3 | Đơn giá B2B | Thu file rate hiện tại ngay Sprint 0; tách **client bill rate** và **vendor pay rate**. |
| 4 | Mức đóng BHXH/phụ cấp | Tạm không đánh giá nội dung nghiệp vụ. Về code, mọi tham số phải effective-dated và cấu hình, không hard-code. |
| 5 | eKYC CCCD | **Hoãn.** Chỉ kích hoạt khi manual verification trở thành bottleneck, ví dụ trên 500 hồ sơ mới/tháng. |
| 6 | Số lượng worker | Thiết kế cho 5.000, load-test 20.000; chưa cần thay kiến trúc. |
| 7 | Số vendor/tài khoản | Với 5–10 vendor, ưu tiên admin reconciliation trước; portal đầy đủ chỉ làm khi workflow nội bộ ổn. |
| 8 | Duyệt tạm ứng | Hai bước: xác nhận số có thể ứng → kế toán duyệt/chi; hạn mức cấu hình theo project/policy. |
| 9 | File chấm công mẫu | Phải có **trước Sprint 1**, không đợi Sprint 9. Đây là đầu vào thiết kế, không phải đầu vào UAT. |
| 10 | Bán kính geofence | Cấu hình theo site; 200m chỉ là default. Luôn có accuracy check và exception workflow. |
| 11 | Kênh gửi payslip | Canonical trong app; Zalo gửi notification/deep link; PDF tạo theo nhu cầu. |
| 12 | Scope của HR_STAFF | Theo team/chi nhánh/phân công; HR_MANAGER có quyền toàn cục và cơ chế thay thế/handover. |
| 13 | Zalo OA verification | Chạy sau feature flag; chưa xác thực không được block MVP. |
| 14 | Fallback OTP | **Bắt buộc có.** OTP là baseline độc lập với Zalo. |
| Ngoài bảng | Nhà cung cấp SMS | Dùng provider adapter; POC ít nhất hai nhà cung cấp theo độ ổn định, callback, support và chi phí. |

### 6.1. Bốn mục `[CẦN CHỐT]` mới bắt buộc bổ sung

| Mục mới | Phương án đề xuất |
|---|---|
| Worker có được đồng thời nhiều assignment không? | Cho phép nhiều assignment nếu lịch/ca không overlap; xác định một `PRIMARY` assignment khi cần. |
| Nguồn tuyển ghi nhận theo nguyên tắc nào? | Lưu toàn bộ source claims; chọn một accepted source có audit, không overwrite lịch sử. |
| Đơn vị khóa payroll là gì? | Theo legal entity/payroll group/kỳ; không khóa riêng từng project. |
| Vendor settlement có tách client billing không? | **Bắt buộc tách.** Hai rate, statement, approval và payment lifecycle độc lập. |

---

## 7. Đề xuất Definition of Done mới

Một feature chỉ được coi là done khi:

- Business rule và state transition có test.
- Migration chạy được trên database sạch và database có dữ liệu cũ.
- API validation, authorization và data scope có integration test.
- Mọi command ghi dữ liệu có idempotency hoặc unique invariant phù hợp.
- Thao tác tài chính/đối soát có audit và không sửa record đã khóa.
- UI phù hợp loại công việc: card cho scanning, table cho reconciliation.
- Có monitoring/error context đủ để vận hành.
- Demo trên dữ liệu scenario thật, không chỉ seed happy-path.
- E2E vertical slice tương ứng vẫn chạy trên CI.

Không bắt buộc Card/List trên mọi màn hình. Không coi mockup hoặc API chạy happy-path là production-ready.

---

## 8. Lộ trình đề xuất rút gọn

| Giai đoạn | Thời lượng | Phạm vi |
|---|---:|---|
| Sprint 0 | 1–2 tuần | Discovery, dữ liệu thật, state model, import/reconciliation spike, schema review |
| Wave 1 | 4 tuần | M0/M1, M3/M5 core, staffing order, worker/submission/assignment, audit |
| Wave 2 | 4 tuần | M7 import/review/approve/lock, M8 rate/statement/export tối giản |
| UAT MVP | 2 tuần | Chạy dữ liệu thật, sửa exception, phân quyền, training và cutover |
| Wave 3 | 4–6 tuần | Worker Portal, GPS evidence, Vendor Portal submission/confirm/dispute |
| Wave 4 | 6–8 tuần | PayRun/payslip hoàn chỉnh, commission, notifications, advanced reports |
| Sau core | Theo điều kiện | M9 HRM, Capacitor, máy chấm công, M10, multi-tenant |

Mốc production-ready 2–3 tháng chỉ nên gắn với **Wave 1 + Wave 2 + UAT MVP**, không gắn với toàn bộ M0–M10.

---

## 9. Kết luận cuối

HRP không cần đổi sang microservices, không cần đổi database và không cần thêm nhiều công nghệ mới. Việc quan trọng nhất trước khi code là giảm scope, sửa ranh giới dữ liệu nghiệp vụ và xây luồng vận hành nội bộ trước các portal bên ngoài.

Nếu thực hiện năm điều chỉnh cốt lõi dưới đây, dự án có thể tăng mức khả thi từ khoảng 5–6/10 lên 8/10:

1. Operations-first thay cho portal-first.
2. Tách các vòng đời trạng thái thay vì một `WorkStatus`.
3. Chấm công ba tầng raw → normalized → approved/locked.
4. Payroll một kết quả/người/kỳ và tách khỏi phân bổ project.
5. Tách vendor payable khỏi client billing, có rate version và statement workflow.

Đây là các quyết định nên được chốt trước khi tạo Prisma schema đầu tiên.
