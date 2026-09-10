# K? ho?ch phát tri?n: H? sinh thái Portal Toàn di?n (All-in-One ERP Workspace)

## 1. T?m nhìn chi?n lu?c (Vision: User-Centric ERP)
"Xây d?ng h? th?ng xong mà ngu?i dùng không th? thao tác hay tuong tác thì không có tác d?ng gì". Ði?m ngh?n l?n nh?t c?a ph?n m?m doanh nghi?p là ch? ph?c v? chi?u thu th?p d? li?u mà quên m?t tr?i nghi?m c?a ngu?i dùng cu?i.

Chúng ta s? chuy?n hu?ng m?nh m?, bi?n HRP thành m?t **H? sinh thái Không gian làm vi?c s? (Digital Workspaces)**. T?ng nhóm ngu?i dùng (Worker, Vendor, CTV, BoD, Public) khi truy c?p vào subdomain c?a mình s? th?y m?t ?ng d?ng hoàn ch?nh, có l?i ích rõ ràng, giúp h? gi?i quy?t công vi?c hàng ngày m?t cách sung su?ng nh?t.

## 2. Quy ho?ch Không gian làm vi?c cho t?ng Role (The Workspaces)

### 2.1. Public Portal (Ch? Giao d?ch vi?c làm)
- **Ð?i tu?ng:** ?ng viên t? do.
- **Giá tr?:** Landing Page thu hút (`warm_professionalism`), SEO-friendly. Tìm ki?m vi?c làm v?i filter realtime và n?p h? so nhanh chóng.

### 2.2. Worker Workspace (worker.hrpartner.vn)
- **Quy ho?ch m?i:** Tr? thành "s? tay di?n t?" c?a công nhân. 
- **Tính nang:** Xem Phi?u luong (Payslip) minh b?ch, qu?n lý ca làm vi?c (Shift), xin ngh? phép, nh?n di?m thu?ng chuyên c?n và c?p nh?t thông tin cá nhân.

### 2.3. Vendor Workspace (vendor.hrpartner.vn)
- **Quy ho?ch m?i:** B2B Partner Portal. 
- **Tính nang:** Xem "ph?u ?ng viên" (t? l? d?u/r?t), theo dõi th?i gian ph?n h?i (SLA), d?i soát công n? t? d?ng tr?c quan và trao d?i tr?c ti?p v?i HR.

### 2.4. Affiliate / CTV Workspace (ctv.hrpartner.vn)
- **Hi?n tr?ng Logic:** N?n t?ng lu?ng Affiliate dã c?c k? v?ng ch?c (qua `SourceClaim` và `CommissionLedger`). H? th?ng dã t? d?ng c?ng/tr? hoa h?ng.
- **Quy ho?ch m?i (Marketing Hub):** Nút "T?o link Affiliate/Mã QR", ví di?n t? theo dõi ti?n hoa h?ng realtime, nút "Yêu c?u rút ti?n", b?ng x?p h?ng CTV. Thay th? giao di?n khô khan hi?n t?i b?ng b?n thi?t k? x?n t? `stitch`.

### 2.5. BoD Dashboard (Báo cáo nhanh cho Giám d?c)
- **Quy ho?ch m?i:** Gom m?i s? li?u sinh t? v? 1 trang duy nh?t cho C-Level (t? thi?t k? `hrp_balanced_4_card_dashboard`).
- **Tính nang:** 4 th? ch? s? quan tr?ng: T?ng Headcount (Bi?n d?ng), T? l? l?p d?y D? án, S?c kh?e tài chính (Qu? luong/Hoa h?ng), và Hi?u su?t tuy?n d?ng.

---

## 3. Ðánh giá Ki?n trúc ch?u t?i cao (High Concurrency Architecture)

Khi chuy?n HRP thành m?t Portal tuong tác cao, d?c bi?t là **Worker Workspace**, chúng ta s? d?i m?t v?i bài toán **"Thundering Herd" (Hi?u ?ng b?y dàn)**: Hàng ngàn công nhân s? d?ng lo?t dang nh?p vào ngày phát luong d? xem Payslip.

Ð? gi?i quy?t v?n d? quá t?i Database Connections và ngh?n CPU, ki?n trúc h? th?ng s? áp d?ng:

1. **Pre-computed Snapshot (T?n d?ng Microservice appBCC):**
   - TUY?T Ð?I không tính toán luong (gross-to-net, thu?, BHXH) khi user b?m xem.
   - Các tác v? tính toán n?ng n? du?c d?y sang service Python (`appBCC`). Khi tính xong, `appBCC` d?y b?n ghi (Snapshot JSON) lên Database. Next.js ch? vi?c truy v?n và render tinh, gi?i phóng hoàn toàn CPU.
2. **Caching (Redis):**
   - Vào k? luong, h? th?ng s? "warm-up" d? li?u phi?u luong vào Redis (In-memory cache). Các API xem luong s? d?c t? Redis thay vì ch?c th?ng xu?ng PostgreSQL.
3. **Connection Pooling:**
   - Ð?m b?o s? d?ng Neon Serverless Driver (qua WebSockets) ho?c PgBouncer d? gi?i h?n s? lu?ng connection, b?o v? DB không b? s?p.
4. **Rate Limiting & Virtual Waiting Room:**
   - Dùng Vercel Edge Middleware d? gi?i h?n truy c?p. N?u vu?t m?c (ví d? 5000 request/giây), ngu?i dùng d?n sau s? vào "Phòng ch? ?o" d? di?u ti?t luu lu?ng.

---

## 4. Chi?n lu?c tri?n khai (Milestones)

L? trình du?c di?u ch?nh d? uu tiên bài toán ch?u t?i c?a Worker Workspace ngay t? s?m:

- **Milestone 1: Design System & Public Portal**
  - C?u hình Design System `warm_professionalism` (`globals.css`).
  - C?t HTML Landing Page & Ch? vi?c làm.
- **Milestone 2: Affiliate Hub (CTV Workspace)**
  - Ð?p giao di?n `hrp_collaborator_page_html_standard` vào `app/ctv`. 
  - N?i API Referral, hi?n th? bi?u d? hoa h?ng.
- **Milestone 3: Worker Workspace & Ki?n trúc Ch?u t?i** *(Uu tiên gi?i quy?t r?i ro Thundering Herd)*
  - Tích h?p Virtual Waiting Room (Rate Limit).
  - Tích h?p Redis Cache và Neon Connection Pooling.
  - Xây d?ng giao di?n xem luong và l?ch làm vi?c cho công nhân.
  - Stress-test (Gi? l?p 10,000 req/s).
- **Milestone 4: BoD Dashboard**
  - Xây d?ng trang t?ng quan cho Ban Giám Ð?c.
- **Milestone 5: Control Tower (BoD Dashboard)**
  - Tri?n khai giao di?n S01_ControlTower_Default_1440.html.
  - Xây d?ng trang t?ng quan cho Ban Giám Ð?c.
- **Milestone 6: Vendor Portal & Reconciliation**
  - Ð?ng b? UI/UX n?i b? và h? th?ng d?i soát công n? Vendor.
  - Tri?n khai S02_Staffing và S04_Reconciliation.

- **Milestone 7: Pre-compute Payslip**
  - Ðua lu?ng tính toán luong n?ng n? v? l?i cho Python ppBCC d? t?i uu tri?t d?.
