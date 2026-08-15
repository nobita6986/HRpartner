# Phân tích Cạnh tranh — viec3mien.vn (Bản đã lược nhạy cảm)

> **Loại:** Tài liệu tham chiếu nội bộ — KHÔNG thuộc contract pipeline 3 tier, không phải nguồn chuẩn của plan.
> **Nguồn:** bộ dữ liệu do sếp cung cấp 15/08/2026 tại `C:\CodeApp\Web\verify.ai86.click\kit` (nằm NGOÀI repo HRP).
> **Đã xử lý:** lược bỏ toàn bộ PII (tên, CCCD, SĐT, địa chỉ), credential (mật khẩu, JWT), tên khách hàng thật, tên người thật. Chỉ giữ kiến trúc + bài học kỹ thuật.
> **Áp dụng:** plan v4.17 §20 — 3 bài học đã chốt (L1–L3) + §20.1 bảng phòng tránh bảo mật.
> **Cảnh báo:** quyền hợp pháp đối với dữ liệu gốc thuộc trách nhiệm của người thu thập (sếp). Tài liệu này chỉ dùng nội bộ để học hỏi thiết kế.

---

## 1. Đối tượng & vị trí so với HRP

**viec3mien.vn** là SaaS quản lý tuyển dụng lao động phổ thông, multi-tenant. Mô hình nghiệp vụ 2 phía:
- **Phía DN tuyển dụng**: đăng chiến dịch tuyển (việc làm), nhận hồ sơ được đẩy lên từ đội ngũ tuyển.
- **Phía đội ngũ tuyển đa cấp (5 lớp)**: nhân viên thao tác hồ sơ ứng viên qua một state machine lớn; khi ứng viên đi làm thật → hưởng hoa hồng theo chính sách bonus, đối soát theo chu kỳ tháng.

| Khía cạnh | viec3mien | HRP |
|---|---|---|
| Trọng tâm | Lead management + bonus engine (kiếm lead → chăm → cho đi làm → tính hoa hồng) | ERP vận hành: chấm công, timesheet, 1-ACTIVE, đối soát chi phí/doanh thu |
| Vòng đời dữ liệu | Ứng viên (chưa có gì) → hồ sơ → trạng thái → đi làm | Worker (đã có HĐ) + 5 state machine nghiệp vụ |
| Đối soát | Đối soát hoa hồng nội bộ (CTV ↔ công ty) | Đối soát kép: vendor payable ↔ client receivable (BigInt đồng) |
| Điểm mạnh | State machine config-driven, work-queue, SMS/Zalo automation, field-visibility matrix | Data scope (RLS + withAuthScope), audit, 1-ACTIVE, Referral Guard, mockup-first |
| Điểm yếu (đã xác minh) | 71 trạng thái, entity 145 field phẳng, 15 lỗi bảo mật (5 CRITICAL) | (đang build — kỷ luật đã đặt trong plan) |

**Kết luận vị trí:** không phải đối thủ trực diện về ERP; là **kho mẫu thiết kế** cho phần "kiếm người" (M5 Talent Pool) và phần "đối soát trạng thái chi" (M8/M6) của HRP.

---

## 2. Kiến trúc kỹ thuật (quan sát từ kit)

| Tầng | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | Angular 17 + ng-zorro (SPA) | Bundle JS 2.72 MB, SEO yếu (SPA fallback, chặn crawler ở một số cấu hình) |
| Backend | ABP 5.4 (multi-tenant, dynamic web api) | 165 controllers / 1.382 endpoints theo Swagger |
| Auth | JWT (24h) + mật khẩu RSA-OAEP client-side + bcrypt cost 12 | Mật khẩu được mã hóa bất đối xứng ngay từ client |
| PII at-rest | AES-CBC cho SĐT/email/CCCD | Điểm hơn HRP hiện tại — HRP chưa có kế hoạch mã hóa at-rest (xem §5 B3) |
| SMS/Notify | FPT SMS + Zalo ZNS | Template có biến `{{...}}`, trigger theo trạng thái |
| Realtime | SignalR | Dùng cho chat/chuyển lead |
| Hạ tầng | Cloudflare + nginx | — |

---

## 3. Domain model đáng chú ý

### 3.1 State machine config-driven
Mỗi trạng thái hồ sơ tự mang cấu hình:
- `updateFields` — form động: vào trạng thái này bắt buộc nhập những field nào (lý do, lịch hẹn, kết quả phỏng vấn, offer…), mỗi field `{isActive, isRequire}`;
- `isAcceptNextUpdateStatus` — cho phép chuyển tiếp hay là trạng thái cuối;
- `careAgainWaitDays` / `duplicateWaitDays` — nhịp chăm sóc lại / chống trùng;
- cờ gửi SMS cho ứng viên / bên khác; ghi chú cho khách hàng / brand.

→ **Ý nghĩa:** business flow được mô tả bằng dữ liệu, không phải code. Đây là chi tiết hóa trực tiếp cho quyết định Q1 của HRP (MVP hardcode → dài hạn config-driven).

### 3.2 Work-queue bucket + transition matrix — phát hiện giá trị nhất
Hệ thống gom trạng thái vào **các ngăn công việc** (work-queue). Mỗi ngăn khai báo:
- `statusInGroup` — hồ sơ ở các trạng thái nào thì nằm trong ngăn này;
- `statusToUpdate` — từ ngăn này **chỉ được phép** chuyển tới những trạng thái nào (transition matrix);
- quyền thao tác của ngăn: có được setup call, cập nhật thông tin, khôi phục, tự chuyển lead, nhận lead phân phối hay không;
- cờ cảnh báo: `isWarning`, `callbackLtNow`, `interviewTimeLtNow` — hồ sơ quá hạn gọi lại / quá giờ phỏng vấn;
- `index` — thứ tự tab hiển thị.

Ví dụ minh họa 5 ngăn (đã chuẩn hóa encoding):
| Ngăn | Ý nghĩa | Transition mẫu |
|---|---|---|
| Cần tư vấn | Hồ sơ mới | → các trạng thái tư vấn 1..9 |
| Cần gọi lại | Đã hẹn chăm sóc | → trạng thái đã gọi/lịch mới |
| Có lịch hẹn | Đã đặt lịch | → tới/không tới |
| Chờ thông báo KQ | Đã phỏng vấn | → đậu/rớt |
| Chờ đi làm | Đã nhận việc | → đã đi làm/không đi |

→ **Kết luận thiết kế:** nhân viên tuyệt đối không thao tác trên state machine thô; họ thấy ~10 ngăn việc, và mỗi ngăn tự giới hạn "được chuyển đi đâu". Điều này trả lời câu hỏi "state machine phức tạp thì nhân viên dùng thế nào" — câu hỏi mà plan M5 của HRP chưa trả lời.

### 3.3 Campaign = cấu hình tuyển dụng hoàn chỉnh
Mỗi chiến dịch tuyển (1 việc làm) là một cụm cấu hình:
- **Field-visibility matrix** theo user-group × hành động (xem/thêm/sửa/ẩn từng field) — ai thấy gì, ai được sửa gì;
- **Distribution setting** — tự động chia lead về người phụ trách;
- **Duplicate setting** — check trùng OR theo nhiều tổ hợp định danh (SĐT1 ∨ SĐT2 ∨ CCCD);
- **Status setting** — auto SMS/email template gắn theo từng trạng thái;
- Storyboard trạng thái của riêng campaign.

### 3.4 Bonus engine + chu trình đối soát tháng
- 6 chính sách hoa hồng: theo công việc thực tế, theo CTV, theo MC, theo quay lại làm, thưởng nóng, + đối soát V1/V2 (chạy lại để bù chênh).
- Chu trình tháng: **generate → review → lock → import trạng thái chi → duyệt chi → xuất Excel**. Điểm mấu chốt: trạng thái *đã khóa đối soát* và trạng thái *đã chi tiền* là **hai thứ tách biệt** (`ImportPaymentStatus` / `UpdatePaymentStatus`).

### 3.5 Khác
Lead source 4 cấp (nguồn → kênh → nhóm → chi tiết); referral code / leaderIdByPhone (truy lead người giới thiệu); GPS check-in + bán kính (tương tự ý tưởng GPS evidence của HRP); nhà trọ, xe đưa đón; chat nội bộ; banner.

---

## 4. Bài học ĐÃ ÁP DỤNG vào plan (v4.17 §20)

| ID | Bài học | Áp dụng vào HRP | Wave |
|---|---|---|---|
| **L1** | Work-queue + transition matrix | M5 Talent Pool — workbench theo ngăn việc; chi tiết hóa Q1 | 1–3 |
| **L2** | Field visibility per role × action | §9.7 Visibility Matrix + data-scope-security (thêm chiều view/add/edit) | 1 |
| **L3** | Tách trạng thái "chi thật" khỏi LOCKED | M8 Statement + M6 Commission ledger — trạng thái chi độc lập, có audit | 2, 4 |

Chi tiết từng bài học xem plan v4.16 §20. **Không đổi scope, không đổi MD.**

---

## 5. Bài học tham khảo — CHƯA áp dụng (mở khi mở task tương ứng)

| ID | Bài học | Khi nào mở |
|---|---|---|
| **B1** | Form động theo trạng thái (`updateFields`) — trường bắt buộc tùy trạng thái | Cùng task M5 work-queue (Wave 1–3) |
| **B2** | Cờ cảnh báo quá hạn trong ngăn việc (`callbackLtNow`, `isWarning`) — hồ sơ nào đang "khét" | Cùng task M5 work-queue |
| **B3** | Mã hóa AES at-rest cho CCCD/SĐT/số TK — điểm hơn HRP hiện tại | Sau MVP, khi có hồ sơ thật; giữ search qua hash, cân nhắc chi phí vận hành |
| **B4** | Cách họ viết JD/SEO cho tin tuyển dụng (chỉ tham khảo ý tưởng, KHÔNG copy chữ) | Khi mở task A-04 job board công cộng (Wave 1 sau M3) |

---

## 6. Anti-patterns — cố ý KHÔNG theo

| Anti-pattern của họ | Lựa chọn của HRP |
|---|---|
| 71 trạng thái hồ sơ, một state machine đơn khổng lồ | 5 state machine nghiệp vụ nhỏ, mỗi cái ≤ ~10 trạng thái (đã chốt trong plan) |
| Entity phẳng 145 field cho hồ sơ | Tách aggregate theo nghiệp vụ (Person/Worker/JobAssignment/Contact…) |
| `GetAll` trả toàn bộ PII trong 1 call + IDOR (thiếu check tenant ownership) | Projection từng màn hình (§9.7) + RLS + `withAuthScope` |
| Tài khoản admin mặc định của framework còn hoạt động + không lockout + Swagger public 1.382 endpoint (F-01/F-02/F-03) | Seed root mật khẩu mạnh bắt buộc + lockout 15 phút + cấm Swagger/debug endpoint production (§15, §15.2) |
| SPA thuần → SEO gần như bằng 0 cho tin tuyển dụng | Next.js App Router + ISR — chính là quyết định Q#23 (trang job board công cộng) |

**Ghi chú thú vị:** 15 lỗi bảo mật của họ (5 CRITICAL) phần lớn **không thể xảy ra** với kiến trúc HRP đã chốt — nhưng riêng mã hóa PII at-rest thì họ làm tốt hơn (xem B3).

### 6.1 Verdict & 15 findings (pentest đã xác nhận — mở rộng v4.17)

**Verdict:** hệ thống bị chiếm quyền admin trong **< 5 phút** (mật khẩu mặc định của framework ABP vẫn hoạt động + endpoint đăng nhập không lockout), sau đó **toàn bộ dữ liệu** — 1.244 hồ sơ PII (CCCD, SĐT, tiền sử bệnh, BHXH, STK), config workflow campaign, cây permission, khách hàng thật — được lấy chỉ bằng GET requests (tổng 10.57 MB, 7 requests). Điểm họ làm đúng: AES at-rest cho SĐT/CCCD, bcrypt cost 12, đã gate debug endpoint, ẩn source map, có WAF Cloudflare.

| ID | Severity | Finding (tóm tắt) |
|---|---|---|
| F-01 | 🔴 9.8 | Tài khoản admin mặc định của framework còn hoạt động trên tenant chính |
| F-02 | 🔴 9.1 | Endpoint đăng nhập không rate-limit/lockout — brute force vô hạn |
| F-03 | 🟠 8.6 | Swagger public — lộ toàn bộ 1.382 endpoints |
| F-04 | 🔴 9.8 | Dump toàn bộ hồ sơ (PII đầy đủ) bằng 1 API call |
| F-05 | 🟠 7.5 | RSA public key public → đóng gói payload brute force |
| F-06 | 🟠 7.1 | Response lộ tên tenant, email admin, version + release date |
| F-07 | 🟡 5.3 | Thiếu 7 security headers (CSP, HSTS, nosniff…) |
| F-08 | 🟡 4.7 | Cloudflare chặn Googlebot (SEO, không phải bảo mật) |
| F-09 | 🟢 3.1 | nginx 1.17.1 (2019) |
| F-10 | 🟠 7.5 | Portal UAT lộ (`production: false`) + URL gateway nội bộ |
| F-11 | 🔴 | GetAll không giới hạn phân trang — 7 requests = full DB |
| F-12 | 🔴 | Campaign/GetAll lộ toàn bộ workflow config (state machine, auto-SMS, field visibility) |
| F-13 | 🟠 | Partner/GetAll lộ khách hàng thật + media paths |
| F-14 | 🟠 | Permission tree 60 KB — toàn bộ UX copy tiếng Việt |
| F-15 | 🟠 | Endpoint bonus policy lộ logic đối soát thưởng |

### 6.2 Gốc rễ: 4 lỗi kiến trúc (không phải 15 lỗi rời rạc)

1. **Không defense-in-depth** — mọi tầng dựa vào 1 lớp Cloudflare; phía sau là auth yếu và authorization không ownership.
2. **Authorization theo role, không theo tenant/ownership** — một admin token đọc được mọi thứ (IDOR + bulk dump).
3. **Lộ bề mặt quá nhiều** — Swagger, env.js, UAT, JS bundle đều public: attacker có bản đồ đầy đủ trước khi tấn công.
4. **Bảo vệ dữ liệu chỉ ở tầng mã hóa, không giới hạn quyền đọc** — AES at-rest vô nghĩa khi attacker đã có admin token.

→ Bảng phòng tránh chi tiết (5 nhóm lỗi → cơ chế HRP): **plan v4.17 §20.1 + §15.2**.

---

## 7. Hạn chế của bộ dữ liệu (đã tự xác minh, không tin theo docs)

1. **Encoding hỏng**: các file lookup lưu bằng encoding sai (UTF-8 đọc thành mojibake, ví dụ "Đi làm" thành "─Éi l├ám"). Có bản fix best-effort nhưng không 100% — bất kỳ file nào muốn dùng phải convert trước.
2. **Phân trang bị cắt**: API trả mặc định 10 item/trang và harvest không lật trang → chỉ có **10/71 trạng thái** và **10/32 ngăn việc**. Bảng transition matrix đầy đủ KHÔNG có trong kit — chỉ đủ để chứng minh mẫu thiết kế, không đủ để copy toàn bộ.
3. **Dữ liệu hồ sơ có dấu hiệu seed/test mạnh**: 1.244 hồ sơ nhưng ~99% cùng một creatorUserId, email test — giá trị nằm ở **cấu trúc 145 field**, không nằm ở nội dung.
4. Một số mô tả trong docs của kit tự mâu thuẫn với dữ liệu thô (vd: "10 status groups A/B/C…" nhưng dữ liệu thực là các ngăn công việc có transition matrix) — mọi kết luận trong tài liệu này đã đối chiếu trực tiếp với JSON, không theo docs.

---

## 8. Nguyên tắc tuân thủ (bắt buộc, không phải khuyến nghị)

1. **Không** đưa bất kỳ file nào của kit vào repo HRP; không commit; giữ nguyên vị trí hiện tại ngoài repo.
2. **Không** dùng PII thật (tên, CCCD, SĐT, địa chỉ) vào seed/mockup/test/fixture của HRP — tuân thủ NĐ 13/2023/NĐ-CP.
3. **Không** copy nguyên văn: cây permission, văn bản JD, tên khách hàng thật, logic bonus chi tiết — chỉ hấp thụ ý tưởng kiến trúc. Các mục này là tài sản trí tuệ của chủ sở hữu phần mềm đối chiếu.
4. Mọi số liệu kinh doanh của họ (target, lương, hoa hồng) chỉ để so sánh thiết kế — không đưa vào plan, không dùng trong mockup.

---

*Tài liệu tạo 15/08/2026 bởi Tier 1 — Planner, theo yêu cầu của sếp. Nguồn: kit viec3mien do sếp cung cấp. Đã lược toàn bộ nhạy cảm trước khi lưu vào repo HRP.*
