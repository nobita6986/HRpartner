# HRP SYSTEM — UNIFIED PROJECT PLAN (v2.1)
## Hệ thống Quản trị Nguồn Nhân lực & Cung ứng Nhân lực

> **Phiên bản:** 2.1
> **Ngày:** 14/08/2026
> **Trạng thái:** Draft - Chờ phê duyệt

> **Domain chính thức:**
> - https://hrpartner.vn (chính)
> - https://hrpvietnam.vn (backup/parity)

---

## 0. CHANGELOG & HƯỚNG DẪN CHỈNH SỬA

### 0.1. Thay đổi so với v1.0

| # | Thay đổi | Lý do |
|---|----------|-------|
| 1 | Thống nhất tech stack: **Next.js App Router**, xóa toàn bộ Fastify/Vite còn sót | v1 tự mâu thuẫn (mục 1.3 nói bỏ Fastify nhưng mục 10.1/10.2/6.2 vẫn dùng) |
| 2 | Thống nhất **1 cấu trúc repo** (modular monolith), xóa phương án 3 apps riêng | 3 kiến trúc frontend khác nhau cùng tồn tại trong v1 |
| 3 | Bản đồ module: **11 module (M0–M10)**, bổ sung Platform Core, Talent Pool, CTV | v1 thiếu CTV Portal và Talent Pool (2 năng lực cốt lõi) dù có trong feature list và WBS |
| 4 | Đổi thứ tự: **M3 CRM & Projects TRƯỚC M4 Vendor Portal** | Vendor Portal cần đọc dự án từ CRM — dependency ngược trong v1 |
| 5 | Effort thống nhất: **440 MD (module) + 30 MD (mobile) = 470 MD**, khớp WBS | v1 có 3 con số khác nhau: 320 / 390 / 440 MD |
| 6 | Timeline thực tế theo **team size giả định (5 devs)** + bảng capacity planning | v1 ghi Phase 1 "4-6 tuần" nhưng scope tương đương 250 MD — bất khả thi với team nhỏ |
| 7 | Tách `workerCategory` thành **3 trục độc lập**: `sourceType` + `employmentType` + `workSetting` | v1 có 2 enum song song trùng nghĩa nhau (THUENGOAI ≈ VENDOR_SUPPLIED) |
| 8 | Sửa lỗi code mẫu: unique constraint payroll, KPI theo khoảng thời gian (không `isActive`), enum nhất quán (bỏ CHO_VIEC/TAM_NGHI), bỏ `isolationLevel` không hợp lệ trong Prisma | Lỗi kỹ thuật sẽ thành bug nếu team copy code mẫu |
| 9 | Bổ sung entity **Hợp đồng & Rate card**, **visibility matrix**, **geofence**, **offline-first**, **luật tính lương VN**, **testing strategy** | Thiếu sót nghiệp vụ quan trọng của v1 |
| 10 | **Compliance dữ liệu cá nhân nâng lên từ Phase 1** (storage nội địa cho CCCD/selfie) | Nghị định 13/2023/NĐ-CP, Luật Dữ liệu 2024 — không thể đợi Phase 3 |
| 11 | Sửa số liệu hạ tầng sai (hạn mức Vercel), bảng so sánh chi phí trung thực (gồm chi phí vận hành) | Số liệu v1 không đúng với bảng giá thực tế |
| 12 | Thêm **đặc tả UI/UX card-based** (mục 4.4): mỗi đối tượng = 1 card, toggle Card/List, bổ sung field `registration_channel` | Yêu cầu từ founder — giao diện thoáng, nhìn lướt thấy thông tin |
| 13 | Thêm **Design System tông màu Cam** (mục 4.5): HRP Brand Identity với primary orange (#f97316) | Thống nhất UI cho team development |
| 14 | Thêm **Zalo Login API** vào Auth (ADR-007b), Tech Stack, WBS E1, Feature A-01b | Quan trọng cho lao động phổ thông — đăng nhập 1 chạm |
| 15 | Sửa domain: `hrp.vn` → `hrpartner.vn`, `vendor.hrp.vn` → `vendor.hrpartner.vn` | Cập nhật domain chính thức của HRP |
| 16 | Thêm **2.1 Cảnh báo kỹ thuật**: Rủi ro phân mảnh tài khoản + Giải pháp upsert theo SĐT | Đảm bảo 1 SĐT = 1 Primary UserID |
| 17 | Thêm task pháp lý Sprint 1: **Xác thực Zalo OA (tích vàng)** | Block tính năng A-01b nếu không có |
| 18 | Thêm cảnh báo **Accessibility WCAG** cho tông màu Cam | Chữ trắng trên nền cam có độ tương phản thấp ngoài trời nắng |
| 19 | Đổi storage: **VNG/Viettel → Cloudflare R2** (S3-compatible, không tính egress) | R2 rẻ hơn + không tốn phí data transfer |
| 20 | Đổi domain chính: `hrpvietnam.vn` → `hrpartner.vn` | Thương hiệu HR Partner |
| 21 | Thêm **Multi-Domain Support** (mục 4.2.1) | Hỗ trợ nhiều domain trỏ về cùng 1 app |

### 0.2. Hướng dẫn cho AI / người chỉnh sửa

- Giữ nguyên cấu trúc mục lục; khi sửa nội dung mục nào, ghi chú vào changelog trên.
- Các phần đánh dấu **[CẦN CHỐT]** là quyết định nghiệp vụ chờ stakeholder — AI có thể đề xuất phương án mặc định nhưng phải giữ đánh dấu.
- Không thêm công nghệ mới khi chưa có mục tương ứng trong ADR (mục 3).
- Mọi con số effort/timeline phải khớp với bảng capacity (mục 7.1).

---

## MỤC LỤC

1. [Tổng quan Dự án](#1-tổng-quan-dự-án)
2. [Personas & Luồng người dùng](#2-personas--luồng-người-dùng)
3. [Quyết định Kiến trúc (ADR)](#3-quyết-định-kiến-trúc-adr)
4. [Cấu trúc Hệ thống](#4-cấu-trúc-hệ-thống)
   - [4.5. Design System — Tông màu Cam](#45-design-system--tông-màu-cam)
   - [4.6. Cảnh báo Kỹ thuật & Rủi ro cho v2.1](#46-cảnh-báo-kỹ-thuật--rủi-ro-cho-v21)
5. [Danh sách Tính năng (Nhóm A–H)](#5-danh-sách-tính-năng-nhóm-ah)
6. [Phân chia Module Thực thi (M0–M10)](#6-phân-chia-module-thực-thi-m0m10)
7. [Phases & Timeline](#7-phases--timeline)
8. [Work Breakdown Structure (WBS)](#8-work-breakdown-structure-wbs)
9. [Thiết kế CSDL — Worker Classification](#9-thiết-kế-csdl--worker-classification)
10. [Hợp đồng, Rate Card & Chính sách Hoa hồng](#10-hợp-đồng-rate-card--chính-sách-hoa-hồng)
11. [Kiến trúc Vendor Portal](#11-kiến-trúc-vendor-portal)
12. [Chấm công & Đối soát](#12-chấm-công--đối-soát)
13. [Tech Stack & Environment](#13-tech-stack--environment)
14. [Serverless Best Practices](#14-serverless-best-practices)
15. [Bảo mật](#15-bảo-mật)
16. [Chiến lược Testing](#16-chiến-lược-testing)
17. [Rủi ro & Mitigation](#17-rủi-ro--mitigation)
18. [Lộ trình Hạ tầng](#18-lộ-trình-hạ-tầng)
19. [Open Questions [CẦN CHỐT]](#19-open-questions-cần-chốt)
20. [Glossary](#20-glossary)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mô tả Dự án

**HRP (Human Resources Portal)** là nền tảng quản trị nguồn nhân lực toàn diện, phục vụ mô hình **cung ứng nhân lực (Outsourcing & Headhunting)** tại Việt Nam.

### 1.2. Ba Bài toán Lõi

| Bài toán | Mô tả | Đối tượng |
|----------|-------|-----------|
| **B2C - Thu hút & Quản lý Nguồn lực** | Cổng thông tin tối giản giúp NLĐ phổ thông dễ dàng tìm việc, chấm công, theo dõi lương. Kết hợp Talent Pool cho remarketing. | Người lao động, CTV, Vendor |
| **B2B - Quản trị Khách hàng & Thầu phụ** | Quản lý dự án, hợp đồng cung ứng cho doanh nghiệp. Điều phối vendor khi thiếu hụt nhân sự. | Doanh nghiệp thuê, Vendor, PM |
| **B2O - Vận hành & Đối soát** | Số hóa chấm công (máy vật lý tại xưởng + selfie/GPS ngoài site). Tách bạch luồng tính lương trực tiếp và luồng thanh toán công nợ B2B. | Kế toán, Admin, HR |

### 1.3. Kiến trúc Tổng thể

```mermaid
flowchart TB
  subgraph Clients["CLIENTS"]
    W["Web Worker<br/>(Mobile-first)"]
    A["Admin Dashboard<br/>hrpartner.vn/admin"]
    V["Vendor Portal<br/>vendor.hrpartner.vn"]
  end
  subgraph App["NEXT.JS APP (Vercel)"]
    MW["Middleware<br/>route theo hostname"]
    R["App Router (Pages)"]
    API["Route Handlers /api/*<br/>(JWT, Rate Limit, Validation)"]
  end
  subgraph Dom["src/domains — BUSINESS LOGIC"]
    D1["auth"]; D2["worker"]; D3["project/crm"]; D4["vendor"]
    D5["talent-pool"]; D6["ctv"]; D7["attendance"]; D8["payroll"]
  end
  subgraph Infra["DATA & SERVICES"]
    DB[("PostgreSQL<br/>Neon → Self-host VN")]
    RD[("Upstash Redis")]
    Q["Upstash QStash (Queue)"]
    S["Object Storage nội địa<br/>(CCCD, selfie, hợp đồng)"]
    EXT["SMS Gateway / Zalo OA / Máy chấm công"]
  end
  W --> R; A --> R; V --> R
  R --> API
  API --> Dom
  Dom --> DB; Dom --> RD; Dom --> S; Dom --> EXT
  API --> Q
```

> **Chốt kỹ thuật:** Backend dùng **Next.js App Router (Route Handlers)** chạy Serverless trên Vercel. **KHÔNG dùng Fastify**, **KHÔNG chia microservices** (xem ADR-001/002).

### 1.4. Chiến lược Triển khai

| Phase | Nội dung | Mục tiêu |
|-------|----------|----------|
| **1a (MVP)** | Auth, Worker Portal core, CRM tối giản | Demo full flow: đăng ký → apply → gán dự án |
| **1b** | GPS Check-in, Vendor Portal, Talent Pool, CTV core | Đủ 3 cổng B2C/B2B + pool |
| **2** | T&A, Payroll, Đối soát, Commission | Vận hành thật: chấm công → tính lương → đối soát |
| **3** | HRM nội bộ, Mobile packaging (PWA/Capacitor) | Nội bộ + trải nghiệm native |

---

## 2. PERSONAS & LUỒNG NGƯỜI DÙNG

### 2.1. Bảng Personas

| ID | Persona | Vai trò | Nhu cầu chính | Pain Points |
|----|---------|---------|---------------|-------------|
| **P1** | Người lao động phổ thông | Worker | Đăng ký nhanh, xem công, xem lương | Thao tác phức tạp, không quen công nghệ |
| **P2** | Cộng tác viên (CTV) | Referrer | Nhập thông tin được giới thiệu, xem hoa hồng | Không biết trạng thái ứng viên |
| **P3** | Vendor | Sub-contractor | Nhập thông tin NLĐ, xem dự án cần người | Muốn chủ động cung ứng |
| **P4** | Nhân sự nội bộ | HR/Sale | Quản lý Talent Pool, phân công dự án | Xử lý nhiều lead, cần tool nhanh |
| **P5** | Quản lý dự án | PM | Gán người, theo dõi tiến độ dự án | Quản lý nhiều vendor cùng lúc |
| **P6** | Kế toán | Accountant | Chốt công, tính lương, đối soát vendor | Tách lương phức tạp |
| **P7** | Admin | System Admin | RBAC, cấu hình hệ thống | Quản lý nhiều quyền |

### 2.2. Các Luồng Chính

**Luồng 1 — Worker Registration:**
1. Đăng ký bằng SĐT → nhận OTP 6 số qua SMS
2. Chụp selfie xác thực (lưu kèm thời điểm đăng ký)
3. Tự hoàn thiện Profile: Họ tên, Ngày sinh, Địa chỉ, CCCD (+ ảnh 2 mặt), Bank
4. Hệ thống tạo **UserID Primary** ngay khi đăng ký

**Luồng 2 — Project Assignment:**
1. Admin/HR gán worker vào dự án → tạo **UserID Secondary** (employeeCode theo dự án)
2. Push thông tin xuống máy chấm công tại xưởng (Phase 2)
3. Worker bắt đầu làm việc

**Luồng 3 — Vendor:**
1. Vendor đăng nhập `vendor.hrpartner.vn` → xem dự án đang cần người
2. Nhập thông tin ứng viên → HRP review (duyệt/từ chối có lý do)
3. Theo dõi trạng thái NLĐ → Phase 2: xem đối soát & xuất biên bản

**Luồng 4 — Chấm công (2 luồng song song):**

| | In-site (tại xưởng) | Out-site (ngoài site) |
|---|---|---|
| Cách thức | Quẹt thẻ máy vật lý | Selfie + GPS qua app |
| Dữ liệu | Máy push log về backend (Phase 2) | Server nhận ảnh + tọa độ |
| Mục đích | **Tính lương** | **Quản lý ý thức** (không tính lương) |
| Xử lý | Kế toán chốt BCC | Lưu history + phát hiện không check-in |

---

## 3. QUYẾT ĐỊNH KIẾN TRÚC (ADR)

| ID | Quyết định | Lựa chọn | Lý do | Trạng thái |
|----|-----------|----------|-------|------------|
| ADR-001 | Backend framework | **Next.js Route Handlers (1 app)** | Fastify không tương thích Vercel Serverless; 1 stack cho cả FE+BE giảm chi phí | Accepted |
| ADR-002 | Kiến trúc module | **Modular monolith** (chia domain trong code, 1 DB, 1 deploy) | Team nhỏ; microservices tăng chi phí vận hành gấp bội. "Độc lập" = độc lập về code domain | Accepted |
| ADR-003 | Cấu trúc frontend | **1 app Next.js**, vendor qua subdomain + middleware | Tránh 3 apps riêng (chi phí ×3 về CI/preview/ops) | Accepted |
| ADR-004 | Database | **PostgreSQL + Prisma** (Neon serverless trước, self-host sau) | ACID, JSONB, PostGIS; Neon pooler giải quyết connection exhaust | Accepted |
| ADR-005 | Hạ tầng | **3 giai đoạn**: Vercel/Neon → Vercel Pro → Self-host VN (Coolify) | Tốc độ ra mắt trước, tuân thủ pháp lý sau; xem mục 18 | Accepted |
| ADR-006 | Lưu trữ dữ liệu cá nhân nhạy cảm | **Cloudflare R2 (S3-compatible, không egress)** ngay từ Phase 1 cho ảnh CCCD + selfie | Nghị định 13/2023/NĐ-CP (dữ liệu sinh trắc học), Luật Dữ liệu 2024 | Accepted |
| ADR-007 | Xác thực | **OTP SMS + JWT + Zalo Login** (access 15', refresh 7d) + device binding | NLĐ phổ thông không dùng mật khẩu; **Zalo Login đăng nhập 1 chạm**; device binding chống sim swap | Accepted |
| ADR-007b | Zalo OA Integration | **Zalo Login API** cho worker đăng nhập nhanh | Quan trọng cho lao động phổ thông; đăng nhập 1 chạm thay vì OTP | Accepted |
| ADR-008 | Mobile | **PWA trước** (camera/GPS/offline), **Capacitor sau** nếu cần Push/NFC | PWA đáp ứng ~90% nhu cầu, không cần duyệt store | Accepted |
| ADR-009 | Xử lý nền | **Upstash QStash** (tính lương hàng loạt, thông báo) | Vercel Functions timeout 10-30s | Accepted |
| ADR-010 | Đồng tiền & làm tròn | VND, `DECIMAL(14,2)`, làm tròn xuống đồng ở net_salary | Tránh sai lệch xu | Accepted |

---

## 4. CẤU TRÚC HỆ THỐNG

### 4.1. Cấu trúc Repository (thống nhất — thay thế mọi cấu trúc khác)

```
hrp/
├── app/                          # Next.js App Router (routes + route handlers)
│   ├── (worker)/                 # Cổng NLĐ — mobile-first
│   ├── (admin)/                  # Admin dashboard
│   ├── (vendor)/                 # Vendor portal (đến từ subdomain qua middleware)
│   ├── api/                      # Route Handlers /api/*
│   └── middleware.ts             # Route theo hostname: vendor.hrpartner.vn → /(vendor)
├── src/
│   ├── domains/                  # Business logic theo module (M0–M10)
│   │   ├── auth/                 # M1
│   │   ├── worker/               # M2
│   │   ├── project/              # M3 (CRM & Projects)
│   │   ├── vendor/               # M4
│   │   ├── talent-pool/          # M5
│   │   ├── ctv/                  # M6
│   │   ├── attendance/           # M7
│   │   └── payroll/              # M8
│   ├── shared/
│   │   ├── types/                # Shared TypeScript types
│   │   ├── utils/                # Utilities
│   │   ├── constants/            # Constants (enums, rate cards mặc định)
│   │   └── errors/               # Error classes
│   └── infrastructure/
│       ├── database/             # Prisma client (singleton) + migrations
│       ├── cache/                # Upstash Redis
│       ├── queue/                # QStash
│       ├── storage/              # Object storage (S3-compatible API)
│       └── external/             # SMS, Zalo OA, máy chấm công, eKYC
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/                        # unit + integration + golden tests (mục 16)
├── docs/
└── README.md
```

**Quy tắc domain:** module chỉ gọi nhau qua function/service export trong `src/domains/*/`; **cấm import chéo ngược** (vd: payroll không import UI của worker). Kiểm tra bằng dependency graph (ESLint boundaries).

### 4.2. URL Structure

```
Worker Portal:      https://hrpartner.vn/                 (mobile-first)
Admin Portal:       https://hrpartner.vn/admin/
Vendor Portal:      https://vendor.hrpartner.vn/          (cùng app, qua middleware)
API:                https://hrpartner.vn/api/*
```

### 4.2.1. Multi-Domain Support (Mở rộng sau này)

**Nguyên tắc:** Hệ thống hỗ trợ nhiều domain trỏ về cùng 1 app, phân biệt bằng middleware:

```typescript
// middleware.ts — xử lý multi-domain
const ALLOWED_DOMAINS = [
  'hrpartner.vn',      // Chính
  'hrpvietnam.vn',     // Backup/parity
  'localhost:3000',    // Dev
];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0];
  const pathname = request.pathname;
  
  // Nếu domain chưa đăng ký → redirect về domain chính
  if (!ALLOWED_DOMAINS.includes(hostname)) {
    return NextResponse.redirect(`https://hrpartner.vn${pathname}`);
  }
  
  // Vendor subdomain
  if (hostname.startsWith('vendor.')) {
    return NextResponse.rewrite(new URL(`/(vendor)${pathname}`, request.url));
  }
  
  return NextResponse.next();
}
```

**Thêm domain mới:**
1. Thêm domain vào `ALLOWED_DOMAINS` trong middleware.ts
2. Trỏ DNS domain về cùng server (Vercel/CF)
3. Cập nhật Open Questions #13 nếu cần

> ⚠️ **Lưu ý:** Tất cả domain phải trỏ về cùng server để chia sẻ session/auth. Cookie domain cần set là `.hrpartner.vn` (cookie đặt ở root domain sẽ có hiệu lực trên subdomain).

### 4.3. Nguyên tắc AI Coding (bắt buộc tuân thủ)

1. **Tách biệt Client vs Server code rõ ràng** — frontend không chứa business logic, chỉ gọi API
2. **API calls dùng absolute URL** (config qua env `NEXT_PUBLIC_API_URL`) — bắt buộc để sau này đóng gói PWA/Capacitor
3. **CORS config sẵn** cho nguồn từ app mobile (sau này)
4. Mọi ghi nhiều bảng phải dùng transaction (mục 14.2)
5. Không hard-code chuỗi tiếng Việt rải rác — tập trung vào file i18n (chỉ 1 ngôn ngữ, nhưng dễ duy trì)

### 4.4. Nguyên tắc thiết kế UI/UX (Card-based)

**Nguyên tắc chung:**

1. **Đơn giản, dễ sử dụng** — ưu tiên người dùng nội bộ không chuyên công nghệ (Sale, HR, PM, kế toán): ít chữ, thao tác thường xuyên ≤ 3 click.
2. **Mỗi đối tượng = 1 thẻ (card)** trong trang quản lý của nó — thông tin quan trọng hiển thị ngay trên thẻ, "nhìn lướt là thấy" không cần mở detail.
3. Bố cục **thoáng** — nhiều khoảng trắng, dùng badge màu cho trạng thái thay vì text dài.
4. **Toggle Card ↔ List** trên mọi trang danh sách: Card để xem nhanh từng đối tượng, List (bảng) để xem tổng thể và so sánh; **nhớ lựa chọn view theo từng người dùng** (localStorage).
5. Action nhanh ngay trên card (hiện khi hover) cho thao tác thường xuyên; chi tiết mở bằng **drawer/modal** thay vì rời trang.
6. Bộ lọc + tìm kiếm áp dụng cho cả 2 chế độ xem; List view sắp xếp được theo cột; pagination cho cả 2 chế độ.
7. Bảng màu badge trạng thái **thống nhất toàn hệ thống** (design system — M0):
   - 🟢 Xanh lá: Đang làm (DANG_LAM) / Active
   - ⚪ Xám: Đang rảnh (DANG_RAIN)
   - 🟡 Vàng: Chờ duyệt (CHODUYET) / Chờ xử lý
   - 🔵 Xanh dương: Tạm nghỉ (TAMNGHI)
   - 🔴 Đỏ: Nghỉ việc (NGHIVIEC) / Blacklist / Từ chối
8. Card hiển thị tối đa 5–6 dòng thông tin; phần còn lại nằm trong drawer chi tiết.

**Đặc tả card từng đối tượng:**

**Card Dự án (M3):**
```
┌──────────────────────────────────────────────┐
│ [TÊN DỰ ÁN]                    [badge trạng thái]│
│ 🏢 Nơi làm việc: KCN Quang Minh, Mê Linh       │
│ 👤 PM: Nguyễn Văn B                            │
│ 💼 Sale: Trần Thị C                            │
│ 👥 Lao động: 12/20  (avatar cluster)           │
│ 📅 Bắt đầu: 01/09/2026                         │
│ [Xem] [Thêm lao động] [Chỉnh sửa]             │
└──────────────────────────────────────────────┘
```

**Card Người lao động (M5 Talent Pool):**
```
┌──────────────────────────────────────────────┐
│ (avatar)  Nguyễn Văn A, 32t    [badge trạng thái]│
│ 📍 Quê quán: Nam Định                          │
│ 🏢 Dự án: Samsung (🟢)  hoặc  "Đang rảnh" (⚪)  │
│ 🤝 Giới thiệu: CTV Lê Văn D (nếu có)          │
│ 👤 Phụ trách: Sale Trần Thị C                  │
│ 📅 Vào hệ thống: 10/08/2026 · Tự đăng ký       │
│ [Chi tiết] [Gán dự án] [Gọi] [Ghi chú]        │
└──────────────────────────────────────────────┘
```
- Dòng "Vào hệ thống" hiển thị `created_at` + kênh nguồn (`registration_channel` — mục 9.2): **Tự đăng ký / Thêm bởi Sale / Thêm bởi HR / Vendor / CTV**.
- Nếu đang làm nhiều dự án: hiển thị dự án active; dự án khác xem trong drawer.

**Card Khách hàng (M3):** tên công ty + lĩnh vực + badge trạng thái hợp đồng; số dự án đang chạy; Sale phụ trách.

**Card Vendor (M4):** tên vendor + khu vực + badge trạng thái hợp đồng khung; số NLĐ đã cung ứng / đang làm; đầu mối phía HRP.

**Card CTV (M6):** tên CTV + khu vực; số người đã giới thiệu / đang làm; hoa hồng lũy kế; badge trạng thái.

**Yêu cầu kỹ thuật:**
- Component dùng chung `EntityCard` + `ViewToggle` trong design system (M0) — mọi module tái sử dụng, không tự chế riêng.
- Thông tin trên card là projection nhẹ (1 API list + join cần thiết), không fetch detail từng card.
- Worker Portal (M2): mobile-first, card tối giản hơn (tên, dự án, lương dự kiến) — không áp dụng nguyên văn đặc tả desktop.

### 4.5. Design System — Tông màu Cam (HRP Brand)

> **Brand Colors:** HRP sử dụng tông màu **cam** làm màu chủ đạo, thể hiện năng động, thân thiện và chuyên nghiệp.

```typescript
// ============================================================
// HRP DESIGN TOKENS — TÔNG MÀU CAM
// ============================================================

const HRP_THEME = {
  // Primary Colors — CAM (Brand Identity)
  primary: {
    50:  '#fff7ed',   // Lightest orange
    100: '#ffedd5',   // Light orange
    200: '#fed7aa',   // Soft orange
    300: '#fdba74',   // Warm orange
    400: '#fb923c',   // Bright orange
    500: '#f97316',   // **MAIN BRAND COLOR** (HRP Orange)
    600: '#ea580c',   // Deep orange
    700: '#c2410c',   // Darker orange
    800: '#9a3412',   // Darkest orange
    900: '#7c2d12',   // Very dark orange
  },
  
  // Accent — Vàng (kết hợp với cam)
  accent: {
    400: '#facc15',   // Bright yellow
    500: '#eab308',   // Main yellow
    600: '#ca8a04',   // Dark yellow
  },
  
  // Semantic Colors
  success: '#22c55e',  // Xanh lá — đang làm, active
  warning: '#eab308',  // Vàng — chờ duyệt
  info:    '#3b82f6',  // Xanh dương — tạm nghỉ
  danger:  '#ef4444',  // Đỏ — nghỉ việc, blacklist
  neutral: '#a1a1aa',  // Xám — đang rảnh
  
  // Background
  bg: {
    primary: '#ffffff',
    secondary: '#fff7ed',  // Light orange tint
    muted: '#f5f5f5',
    card: '#ffffff',
  },
  
  // Text
  text: {
    primary: '#1f2937',    // Dark gray
    secondary: '#6b7280',  // Medium gray
    muted: '#9ca3af',      // Light gray
    inverse: '#ffffff',    // White text on dark backgrounds
  },
};

// Badge colors (theo mục 4.4)
const STATUS_BADGES = {
  DANG_LAM:  { bg: '#dcfce7', text: '#166534', label: 'Đang làm' },      // 🟢
  DANG_RAIN: { bg: '#f4f4f5', text: '#71717a', label: 'Đang rảnh' },    // ⚪
  CHODUYET:  { bg: '#fef9c3', text: '#854d0e', label: 'Chờ duyệt' },     // 🟡
  TAMNGHI:   { bg: '#dbeafe', text: '#1e40af', label: 'Tạm nghỉ' },      // 🔵
  NGHIVIEC:  { bg: '#fee2e2', text: '#991b1b', label: 'Nghỉ việc' },    // 🔴
  BLACKLIST: { bg: '#fee2e2', text: '#991b1b', label: 'Blacklist' },     // 🔴
};
```

**Nguyên tắc sử dụng màu:**
1. **Primary Button, Logo, Header:** `primary-500` (#f97316)
2. **Hover states:** `primary-600` (#ea580c)
3. **Active/Selected:** `primary-700` (#c2410c)
4. **Background tint:** `primary-50` (#fff7ed) cho card headers, section backgrounds
5. **Accent buttons/links:** `accent-500` cho CTAs phụ

**Typography:**
- Font chính: Inter (hoặc system font stack)
- Font tiếng Việt: hỗ trợ đầy đủ dấu tiếng Việt
- Scale: 12/14/16/18/20/24/30/36px

### 4.6. Cảnh báo Kỹ thuật & Rủi ro cho v2.1

#### 4.6.1. Rủi ro phân mảnh tài khoản (Account Merging)

**Vấn đề:** Khi hệ thống song song tồn tại "Đăng nhập OTP" và "Zalo Login", sẽ xảy ra trường hợp người lao động đăng nhập bằng Zalo hôm nay, nhưng ngày mai lại dùng số điện thoại để nhận OTP.

**Giải pháp bắt buộc:**
```typescript
// API Auth Zalo callback — lấy SĐT từ Zalo, upsert theo SĐT
async function zaloLoginCallback(zaloUserId: string, accessToken: string) {
  // 1. Lấy thông tin user từ Zalo API (có SĐT nếu user cho phép)
  const zaloInfo = await getZaloUserInfo(accessToken);
  
  // 2. Upsert theo SĐT — đảm bảo 1 SĐT = 1 Primary UserID
  const worker = await prisma.worker.upsert({
    where: { phone: zaloInfo.phone },  // SĐT là định danh gốc
    update: { zaloUserId },            // Cập nhật Zalo link
    create: {
      phone: zaloInfo.phone,
      zaloUserId,
      // ... tạo worker mới
    }
  });
  
  // 3. Trả JWT với worker.id làm userId
  return generateJWT(worker.id);
}
```

> **Nguyên tắc vàng:** Dù đăng nhập bằng kênh nào (OTP/Zalo), 1 số điện thoại chỉ trỏ về đúng 1 Primary UserID duy nhất.

#### 4.6.2. Nút thắt vận hành của Zalo OA

**Vấn đề:** Để sử dụng API lấy số điện thoại người dùng của Zalo, ứng dụng Zalo (App ID) phải được liên kết với một **Zalo Official Account (OA) đã được xác thực (tích vàng)**.

**Hành động bắt buộc trong Sprint 1:**
| Task | Người phụ trách | Thời hạn |
|------|------------------|----------|
| Chuẩn bị giấy phép kinh doanh (PLĐK) | Founder/Admin | Trước Sprint 1 |
| Nộp xác thực Zalo OA (tích vàng) | Founder | Sprint 1 tuần 1 |
| Liên kết App ID với OA đã xác thực | Dev | Sprint 1 tuần 1 |
| Test Zalo Login API | Dev | Sprint 1 tuần 2 |

> ⚠️ **Cảnh báo:** Nếu không hoàn thành xác thực Zalo OA, tính năng A-01b (Đăng nhập Zalo) sẽ bị **block hoàn toàn** ở Phase 1. Cần có plan B (OTP-only) trong MVP.

#### 4.6.3. Accessibility — Tông màu Cam ngoài trời

**Vấn đề:** Chữ trắng (`#ffffff`) trên nền cam (`#f97316`) có độ tương phản ~3.0:1, không đạt chuẩn WCAG AA (4.5:1 cho text thường). Người lao động mở app ngoài trời nắng (công trường, xưởng) sẽ khó đọc.

**Giải pháp UI:**
```typescript
// Sửa design tokens
const HRP_THEME = {
  primary: {
    // ... giữ nguyên
  },
  // Button với text đậm để tăng contrast
  button: {
    primary: {
      bg: '#f97316',      // Cam chủ đạo
      text: '#ffffff',    // Chấp nhận thấp hơn WCAG AA cho button
      // HOẶC dùng nền đậm hơn:
      // bg: '#c2410c',    // Cam đậm hơn → contrast ~5:1
      // text: '#ffffff',
    }
  },
  // Badge/text nhỏ: dùng nền nhạt + text đậm
  badge: {
    bg: '#fff7ed',       // Nền cam rất nhạt
    text: '#9a3412',     // Cam đậm → contrast ~7:1
  }
};
```

**Checklist UI/UX trước Phase 1:**
- [ ] Test contrast trên điện thoại ngoài trời (full sun)
- [ ] Đảm bảo nút bấm chính có fallback nếu tap sai (vì khó đọc)
- [ ] Font size tối thiểu 16px cho body text (tránh iOS zoom)

---

## 5. DANH SÁCH TÍNH NĂNG (NHÓM A–H)

> Nhóm A–H là **nhóm yêu cầu nghiệp vụ**; Module M0–M10 (mục 6) là **đơn vị thực thi**. Một nhóm có thể trải trên nhiều module.

### 5.1. Nhóm A: Cổng thông tin & App Người lao động (Worker Portal)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **A-01** | Đăng nhập OTP | SĐT + OTP 6 số qua SMS | P0 | 1 |
| **A-01b** | **Đăng nhập Zalo** | Đăng nhập 1 chạm qua Zalo OA (quan trọng cho lao động phổ thông) | P0 | 1 |
| **A-02** | Hoàn thiện Profile | Worker tự điền: Họ tên, CCCD, Bank, Địa chỉ... | P0 | 1 |
| **A-03** | Đăng ký nhanh | Tạo UserID ngay khi đăng ký (chỉ cần SĐT) | P0 | 1 |
| **A-04** | Bảng tin việc làm | Job Card với filter | P0 | 1 |
| **A-05** | Ứng tuyển 1 chạm | Gửi SĐT + thông tin cơ bản | P0 | 1 |
| **A-06** | Xem thông tin dự án | Tên, địa điểm, quản lý | P0 | 1 |
| **A-07** | Chấm công in-site | Dùng máy vật lý (xưởng) | P1 | 2 |
| **A-08** | Check-in ngoài site | **Selfie + GPS** (quản lý ý thức) | **P0** | **1b** |
| **A-09** | Xem lịch sử chấm công | Từ máy vật lý + Check-in GPS | P0 | 1b |
| **A-10** | Xem phiếu lương | Chi tiết theo kỳ | P0 | 2 |
| **A-11** | Đề nghị tạm ứng | Gửi request (chỉ HRP direct) | P0 | 2 |
| **A-12** | Phản ánh/Khiếu nại | Báo sai công, sai lương | P0 | 2 |
| **A-13** | Cập nhật thông tin | Bank, CCCD, SĐT | P0 | 1 |

### 5.2. Nhóm B: Cộng tác viên & Giới thiệu (CTV Portal)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **B-01** | Đăng ký CTV | Họ tên, CCCD, STK | P0 | 1b |
| **B-02** | Nhập người được giới thiệu | SĐT, Họ Tên, Dự án | P0 | 1b |
| **B-03** | Dashboard theo dõi | Trạng thái + hoa hồng | P0 | 1b |
| **B-04** | Lịch sử hoa hồng | Chi tiết từng khoản | P1 | 2 |
| **B-05** | Thông báo | Zalo/SMS khi có cập nhật | P1 | 2 |

### 5.3. Nhóm C: Vendor Portal (subdomain)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **C-01** | Đăng nhập Vendor | Tài khoản riêng subdomain | P0 | 1b |
| **C-02** | Xem danh sách dự án | Dự án đang cần người | P0 | 1b |
| **C-03** | Nhập thông tin NLĐ | Form nhập thông tin ứng viên | P0 | 1b |
| **C-04** | Xem trạng thái | NLĐ đã được duyệt/chưa | P0 | 1b |
| **C-05** | Xem đối soát | Tổng ngày công NLĐ vendor | P1 | 2 |
| **C-06** | Xuất báo cáo | Biên bản đối soát B2B | P1 | 2 |

### 5.4. Nhóm D: Quản trị B2B CRM & Dự án

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **D-01** | CRUD Khách hàng | Hồ sơ doanh nghiệp | P0 | 1a |
| **D-02** | CRUD Dự án | Tạo, gán PM, quota tuyển | P0 | 1a |
| **D-03** | Quản lý Pipeline | Kanban: Tiếp cận→Ký HĐ→Thực thi | P0 | 1b |
| **D-04** | CRUD Máy chấm công | Serial, IP, Map vào Dự án | P1 | 2 |
| **D-05** | Gán nhân sự | Điều động vào dự án | P0 | 1b |
| **D-06** | Import từ Vendor | Nhận danh sách từ vendor | P0 | 1b |

### 5.5. Nhóm E: Talent Pool & ATS

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **E-01** | Hồ sơ NLĐ | Master data đầy đủ | P0 | 1b |
| **E-02** | Vòng đời trạng thái | CHODUYET→DANG_RAIN→DANG_LAM→... | P0 | 1b |
| **E-03** | Phân loại nguồn gốc | sourceType + employmentType + workSetting (mục 9) | P0 | **1b** |
| **E-04** | Bộ lọc nâng cao | Tuổi, khu vực, kỹ năng | P0 | 1b |
| **E-05** | Xuất Excel | Export data | P1 | 2 |
| **E-06** | Lịch sử tương tác | Ghi chú, log cuộc gọi | P1 | 2 |

### 5.6. Nhóm F: Vận hành & T&A

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **F-01** | Webhook T&A | Nhận log từ máy vật lý | P0 | 2 |
| **F-02** | Giao diện BCC | Xử lý công thủ công | P0 | 2 |
| **F-03** | Tách BCC | HRP vs Vendor | P0 | 2 |
| **F-04** | Xử lý ticket | Phản ánh, tạm ứng | P0 | 2 |
| **F-05** | Check-in GPS log | Lưu selfie + GPS ngoài site | P0 | **1b** |
| **F-06** | SOP ngoại lệ | Mất điện, máy hỏng | P1 | 2 |

### 5.7. Nhóm G: Lương & Thanh toán

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **G-01** | Tính lương HRP | Tự động tính lương NLĐ direct | P0 | 2 |
| **G-02** | Đối soát Vendor | Tổng hợp công → Báo cáo B2B | P0 | 2 |
| **G-03** | Tính hoa hồng CTV | Tự động tính commission | P1 | 2 |
| **G-04** | Xuất file lương | Excel payroll | P0 | 2 |
| **G-05** | Quản lý công nợ | Theo dõi thanh toán | P1 | 2 |

### 5.8. Nhóm H: Nhân sự Nội bộ (HRM)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **H-01** | CRUD nhân viên | Mã NV, thông tin nội bộ | P0 | 3 |
| **H-02** | Sơ đồ tổ chức | Cây phòng ban, cấp báo cáo | P1 | 3 |
| **H-03** | RBAC | Roles + Permissions | P0 | 1a |
| **H-04** | Data-level security | PM chỉ thấy data của mình | P0 | 1a |

---

## 6. PHÂN CHIA MODULE THỰC THI (M0–M10)

### 6.1. Nguyên tắc

1. Mỗi module = **1 domain code độc lập** trong `src/domains/` — độc lập về code, **dùng chung** 1 app + 1 DB (modular monolith, ADR-002). Không deploy riêng.
2. Mỗi module có: effort, phase, priority, DoD, danh sách mockup UI.
3. Module phụ thuộc phải **được làm trước hoặc song song với API contract** (giao ước endpoint/schema) — không chờ hoàn thiện 100%.
4. Mockup-first cho module Phase sau để stakeholder duyệt sớm.

### 6.2. Bảng 11 Module

| Module | Tên | Effort (MD) | Phase | Priority | Ghi chú |
|--------|-----|-------------|-------|----------|---------|
| **M0** | Platform Core | 40 | 1a–3 | P0 | Repo, CI/CD, DB migration, design system, logging, monitoring |
| **M1** | Auth & RBAC | 30 | 1a | P0 | OTP SMS, JWT, RBAC, device binding |
| **M2** | Worker Portal | 50 | 1a–2 | P0 | Đăng ký, profile, job board, quick apply, GPS check-in, payslip view |
| **M3** | CRM & Projects | 40 | 1a–1b | P0 | Client/Project CRUD, Kanban, PM assignment, Contract v1 |
| **M4** | Vendor Portal | 20 | 1b | P0 | Subdomain, xem dự án, nhập NLĐ, track status |
| **M5** | Talent Pool & ATS | 40 | 1b–2 | P0 | Master data, lifecycle, classification, filters, export |
| **M6** | CTV Portal & Commission | 40 | 1b–2 | P0 | Đăng ký CTV, referral, dashboard, hoa hồng |
| **M7** | Attendance (T&A) | 50 | 2 | P0 | Import Excel, webhook máy, BCC, ticket, GPS admin |
| **M8** | Payroll & Billing | 60 | 2 | P0 | Tính lương, payslip, đối soát vendor, KPI |
| **M9** | HRM (Nhân sự nội bộ) | 40 | 3 | P1 | Employee CRUD, org chart, nghỉ phép — **mockup trước** |
| **M10** | Assets & Equipment | 30 | 3+ | P2 | **Mockup only** (code ngoài horizon) |
| | Mobile packaging (thuộc M2) | 30 | 3 | P1 | PWA trước, Capacitor nếu cần |
| | **Tổng** | **470 MD** | | | 440 (module) + 30 (mobile) |

### 6.3. Đồ thị Phụ thuộc

```mermaid
flowchart TD
  M0["M0 Platform Core"] --> M1["M1 Auth & RBAC"]
  M1 --> M2["M2 Worker Portal"]
  M1 --> M3["M3 CRM & Projects"]
  M1 --> M4["M4 Vendor Portal"]
  M1 --> M5["M5 Talent Pool & ATS"]
  M1 --> M6["M6 CTV & Commission"]
  M3 --> M4
  M5 --> M2
  M2 --> M7["M7 Attendance (T&A)"]
  M5 --> M7
  M3 --> M7
  M7 --> M8["M8 Payroll & Billing"]
  M3 --> M8
  M6 --> M8
  M1 --> M9["M9 HRM"]
```

> **Lưu ý quan trọng:** M4 (Vendor) phụ thuộc M3 (Projects) — vendor cần đọc danh sách dự án. Vì vậy M3 **phải làm trước hoặc song song** M4 (đã đổi thứ tự so với v1).

### 6.4. Thứ tự Sprint

| Sprint | Nội dung | Modules |
|--------|----------|---------|
| 1–2 | Foundation: repo, CI/CD, schema, Auth | M0 (core), M1 |
| 3–4 | Worker Portal core + CRM tối giản | M2 (đăng ký, profile, job board, apply), M3 (CRUD + isPublic + quota) |
| 5–6 | GPS Check-in + Vendor + Talent Pool | M2 (GPS), M4, M5 (core) |
| 7–8 | Kanban + CTV core | M3 (Kanban, PM, staff assignment), M6 (đăng ký, referral, dashboard) |
| 9–10 | Attendance: import Excel + BCC | M7 (import, BCC, tách HRP/Vendor) |
| 11–12 | Máy chấm công + Payroll | M7 (webhook, ticket), M8 (tính lương, đối soát) |
| 13–14 | Commission + KPI + UAT | M6 (hoa hồng), M8 (KPI, payslip), integration test |
| 15–16 | HRM + Mobile | M9, Mobile packaging, M10 mockup |

### 6.5. Mockup Strategy

- **Mục đích:** stakeholder thấy tổng thể trước khi code xong; phát hiện sai requirement sớm; demo toàn hệ thống bằng prototype.
- **Cách làm:** Figma/HTML mockup cho ALL module → link prototype flow → demo → code lần lượt.
- **Priority:**
  - M1–M8: code thật, mockup chỉ cho màn khó (payroll, BCC)
  - M9 (HRM): **mockup trước Phase 3** để stakeholder review
  - M10 (Assets): **mockup only** để hình dung Phase sau

**Yêu cầu mockup tối thiểu cho từng module:** giữ nguyên danh sách màn từ v1:
- M1: Login (SĐT+OTP), OTP modal, chọn vai trò
- M2: Đăng ký 4 bước, home, job board + filter, job detail + apply, profile, GPS check-in, lịch sử chấm công, payslip viewer
- M3: Client list/detail, project list + Kanban, project detail + assignment, contract
- M4: Login subdomain, dashboard, project list, form nhập NLĐ, status list, billing summary
- M5: Pool list + filter, worker detail + timeline trạng thái
- M6: CTV đăng ký, form referral, dashboard (status + hoa hồng)
- M7: Import Excel, bảng công, GPS logs, ticket, exception handling
- M8: Giao diện tính lương, bảng lương, payslip template, biên bản đối soát, KPI dashboard
- M9: Employee directory, org chart, leave request flow
- M10: Asset registry, assign, checklist, return process

**Quy ước chung:** mọi màn danh sách phải có mockup **cả 2 chế độ Card và List** theo đặc tả mục 4.4.

### 6.6. Definition of Done (DoD) chung

Mỗi feature thuộc module được coi là done khi:
- [ ] Code qua review + unit test cho logic nghiệp vụ (đặc biệt M8)
- [ ] Schema migration kèm theo, không phá data cũ
- [ ] Mockup/UI khớp thiết kế đã duyệt, responsive mobile (đối với M2)
- [ ] **Demo cuối sprint cho stakeholder** (bắt buộc — cơ chế bắt sai requirement sớm)
- [ ] API có validation + error response chuẩn
- [ ] Màn danh sách có đủ 2 chế độ Card/List theo đặc tả mục 4.4

---

## 7. PHASES & TIMELINE

### 7.1. Giả định Team & Capacity

| Giả định | Giá trị |
|----------|---------|
| Đội hình | 5 devs (1 lead + 4), 1 QA bán thời gian, 1 PO/BA |
| Velocity thực tế | ~80% (≈ **20 MD/tuần**) |
| Sprint | 2 tuần |

**Capacity theo quy mô team:**

| Team | MD/tuần (80%) | Tổng thời gian (470 MD) |
|------|---------------|--------------------------|
| 5 devs | ~20 | **~24 tuần (~6 tháng)** |
| 8 devs | ~32 | ~15–16 tuần (~4 tháng) |

> v1 ghi "Phase 1: 4–6 tuần" nhưng scope Phase 1 tương đương ~205 MD — chỉ khả thi với team ≥ 8–10 devs. Timeline dưới đây tính theo team 5 devs; nếu muốn nhanh hơn, tăng team hoặc cắt scope (xem 7.5).

### 7.2. Chi tiết từng Phase

#### PHASE 1a: CORE PLATFORM MVP (~100 MD, 5–6 tuần)

| Thành phần | Deliverables | Exit Criteria |
|------------|--------------|---------------|
| M0 core | Repo, CI/CD, Prisma schema v1, design system | Push là auto-deploy preview |
| M1 Auth | Login OTP, JWT, RBAC core, device binding | User đăng nhập được, phân quyền hoạt động |
| M2 core | Đăng ký, profile, job board, quick apply | Worker đăng ký → nhận UserID → apply được |
| M3 tối giản | Client CRUD, Project CRUD (isPublic, quota) | Admin tạo dự án công khai trên job board |

**Phase 1a Exit Criteria:**
- [ ] Worker đăng ký và nhận UserID
- [ ] Job board hiển thị dự án công khai, apply 1 chạm hoạt động
- [ ] Admin quản lý client/project cơ bản

#### PHASE 1b: MỞ RỘNG B2B/B2C (~105 MD, 5–6 tuần)

| Thành phần | Deliverables | Exit Criteria |
|------------|--------------|---------------|
| M2 GPS | Check-in selfie + GPS + lịch sử | Worker check-in hàng ngày, admin xem log |
| M4 Vendor | Subdomain, xem dự án, nhập NLĐ, review workflow | Vendor đăng nhập & nhập được NLĐ |
| M5 core | Pool list, classification 3 trục, filters, lifecycle | HR phân loại & lọc được worker |
| M6 core | CTV đăng ký, nhập referral, dashboard | CTV nhập được người và xem trạng thái |
| M3 hoàn thiện | Kanban, PM assignment, staff assignment | Điều động worker vào dự án |

**Phase 1b Exit Criteria:**
- [ ] GPS check-in hoạt động (ý thức NLĐ)
- [ ] Vendor nhập NLĐ qua subdomain, HR duyệt
- [ ] CTV theo dõi referral
- [ ] Demo full flow: đăng ký → pool → gán dự án → chuyển dự án

#### PHASE 2: OPERATIONS & T&A (~155 MD, 8 tuần)

| Thành phần | Deliverables | Exit Criteria |
|------------|--------------|---------------|
| M7 | Import Excel (template per partner), BCC, webhook máy, ticket | Kế toán import & chốt công được |
| M8 | Tính lương (luật VN), đối soát vendor, payslip, KPI | Xuất bảng lương + biên bản đối soát |
| M6 hoàn thiện | Tính hoa hồng, lịch sử, thông báo | CTV thấy hoa hồng từng kỳ |
| M5 hoàn thiện | Export Excel, activity log | |
| M0 hoàn thiện | Sentry, alerting, hardening | |

**Phase 2 Exit Criteria:**
- [ ] Kế toán import file chấm công từ đối tác (≥ 2 format mẫu thật)
- [ ] Hệ thống tính lương + KPI đúng golden tests
- [ ] Worker xem phiếu lương, gửi phản ánh/tạm ứng
- [ ] Đối soát vendor xuất được biên bản

#### PHASE 3: HRM & MOBILE (~90 MD, 5 tuần)

| Thành phần | Deliverables | Exit Criteria |
|------------|--------------|---------------|
| M9 | Employee CRUD, org chart, leave mgmt | Nhân sự nội bộ quản lý được |
| M10 | Mockup Assets (không code) | Stakeholder duyệt hướng |
| Mobile | **PWA** (installable + offline queue + camera/GPS); Capacitor APK nếu cần | Worker dùng được offline check-in |

**Ghi chú:** Đăng ký chỉ cần SĐT + OTP. Worker tự điền Profile (Họ tên, CCCD, Bank...) sau.

### 7.3. Gantt minh họa (team 5 devs, kick-off 24/08/2026)

```mermaid
gantt
  title Timeline HRP v2 — team 5 devs
  dateFormat YYYY-MM-DD
  section Phase 1a (100 MD)
  M0 Platform Core (nền)       :2026-08-24, 4w
  M1 Auth & RBAC               :2026-08-24, 3w
  M2 Worker Portal (core)      :2026-09-07, 4w
  M3 CRM & Projects (tối giản) :2026-09-07, 4w
  Demo MVP                     :milestone, 2026-10-05, 0d
  section Phase 1b (105 MD)
  M2 GPS Check-in              :2026-10-05, 2w
  M4 Vendor Portal             :2026-10-05, 3w
  M5 Talent Pool               :2026-10-05, 4w
  M3 Kanban + PM assignment    :2026-10-19, 3w
  M6 CTV (core)                :2026-10-19, 3w
  Demo Phase 1 hoàn chỉnh      :milestone, 2026-11-16, 0d
  section Phase 2 (155 MD)
  M7 Attendance (T&A)          :2026-11-16, 4w
  M8 Payroll & Billing         :2026-11-30, 5w
  M6 Commission + M5 Export    :2026-12-28, 2w
  M0 Monitoring + Hardening    :2027-01-04, 2w
  UAT + Fix                    :2027-01-04, 2w
  Go-live Phase 2              :milestone, 2027-01-18, 0d
  section Phase 3 (90 MD)
  M9 HRM                       :2027-01-18, 3w
  M10 Assets (mockup)          :2027-02-01, 2w
  Mobile PWA/Capacitor         :2027-01-25, 3w
  Hoàn thành                   :milestone, 2027-02-22, 0d
```

### 7.4. Lộ trình Rút gọn (nếu cần ra mắt nhanh hơn)

Cắt theo thứ tự ưu tiên: Kanban (thay bằng list đơn giản) → M6 commission → M5 export → M9. Phase 1a có thể rút về **4–5 tuần** nếu bỏ device binding và giảm design system.

---

## 8. WORK BREAKDOWN STRUCTURE (WBS)

### 8.1. Epic Mapping (khớp 1:1 với module)

| Epic | Tên | Module | Phase | Effort (MD) |
|------|-----|--------|-------|-------------|
| **E0** | Platform Core & Infrastructure | M0 | 1a–3 | 40 |
| **E1** | Auth & RBAC | M1 | 1a | 30 |
| **E2** | Worker Portal (B2C) | M2 | 1a–2 | 50 |
| **E3** | CRM & Project Management | M3 | 1a–1b | 40 |
| **E4** | Vendor Portal (subdomain) | M4 | 1b | 20 |
| **E5** | Talent Pool & ATS | M5 | 1b–2 | 40 |
| **E6** | CTV Portal & Commission | M6 | 1b–2 | 40 |
| **E7** | Attendance Import & Machine Sync | M7 | 2 | 50 |
| **E8** | Payroll, Vendor Billing & KPI | M8 | 2 | 60 |
| **E9** | HRM (Nhân sự nội bộ) | M9 | 3 | 40 |
| **E10** | Assets & Equipment (mockup) | M10 | 3+ | 30 |
| **E11** | Mobile Packaging (PWA/Capacitor) | M2 | 3 | 30 |
| | **Tổng** | | | **470 MD** |

### 8.2. WBS chi tiết Phase 1a + 1b

```
E0: PLATFORM CORE
├── 0.1 Repo setup (Next.js, TypeScript, ESLint, Prettier)
├── 0.2 CI/CD (GitHub Actions + Vercel preview/production)
├── 0.3 Prisma schema v1 + migration workflow
├── 0.4 Design system base (Tailwind + shadcn/ui + layout)
└── 0.5 Logging (Pino) + error tracking (Sentry — Phase 2 hoàn thiện)

E1: AUTH & RBAC
├── 1.1 OTP SMS (send/verify, rate limit, resend)
├── 1.2 Zalo Login (Zalo OA API — đăng nhập 1 chạm cho lao động phổ thông)
├── 1.3 JWT access (15') + refresh (7d)
├── 1.4 RBAC roles/permissions (ADMIN, HR_MANAGER, HR_STAFF, SALE, PM,
│      ACCOUNTANT, VENDOR_ADMIN, VENDOR_STAFF, CTV, WORKER)
├── 1.5 Device binding + suspicious login detection
└── 1.6 Data-level security middleware (visibility matrix — mục 9.6)

E2: WORKER PORTAL
├── 2.1 Registration flow (SĐT → OTP → selfie → profile)
├── 2.2 Job Board (list + filter + ISR cache)
├── 2.3 Quick Apply
├── 2.4 Profile management (CCCD upload, bank info)
├── 2.5 GPS Check-in (camera + geolocation + offline queue) [Phase 1b]
├── 2.6 Attendance history [Phase 1b]
└── 2.7 Payslip viewer [Phase 2]

E3: CRM & PROJECTS
├── 3.1 Client CRUD [Phase 1a]
├── 3.2 Project CRUD + isPublic + quota [Phase 1a]
├── 3.3 Kanban Pipeline [Phase 1b]
├── 3.4 PM Assignment [Phase 1b]
├── 3.5 Staff Assignment (điều động worker) [Phase 1b]
└── 3.6 Contract v1 (HĐLĐ/HĐ cung ứng) [Phase 1b]

E4: VENDOR PORTAL
├── 4.1 Subdomain routing (middleware hostname)
├── 4.2 Vendor Auth + RBAC (VENDOR_ADMIN/STAFF)
├── 4.3 Open project listing + filters
├── 4.4 Worker input form (+ validation)
├── 4.5 Status tracking (pending/approved/rejected + lý do)
└── 4.6 Admin review workflow

E5: TALENT POOL & ATS
├── 5.1 Worker master data + edit history
├── 5.2 Status lifecycle + transition guards
├── 5.3 Classification 3 trục (sourceType/employmentType/workSetting)
├── 5.4 Advanced filters (tuổi, khu vực, kỹ năng, trạng thái)
├── 5.5 Data isolation theo visibility matrix
├── 5.6 Excel export [Phase 2]
└── 5.7 Activity logs (ghi chú, log cuộc gọi) [Phase 2]

E6: CTV & COMMISSION
├── 6.1 CTV registration
├── 6.2 Referral input form (SĐT, họ tên, dự án)
├── 6.3 Dashboard (trạng thái referral)
├── 6.4 Commission calculation [Phase 2]
└── 6.5 Notification (Zalo/SMS) [Phase 2]

E7: ATTENDANCE (Phase 2)
├── 7.1 Import Excel/CSV + template per partner
├── 7.2 Auto-mapping employeeCode → worker + validation
├── 7.3 BCC interface (chốt công, sửa thủ công, tách HRP/Vendor)
├── 7.4 Machine webhook (ADMS/HTTP push — khảo sát hãng máy)
├── 7.5 Ticket system (phản ánh, tạm ứng)
└── 7.6 Exception SOP (mất điện, máy hỏng)

E8: PAYROLL & BILLING (Phase 2)
├── 8.1 Payroll engine (luật VN — mục 12.5) + golden tests
├── 8.2 Payslip generation (PDF/HTML) + worker view
├── 8.3 Vendor billing (đối soát theo rate card)
├── 8.4 KPI calculation (giờ công → manager/CTV)
├── 8.5 Payroll lock (DRAFT → LOCKED → PAID) + audit
└── 8.6 Excel export (bảng lương, biên bản đối soát)

E9: HRM (Phase 3)
├── 9.1 Employee CRUD
├── 9.2 Org chart
├── 9.3 Leave management
└── 9.4 Performance review (mockup trước)

E10: ASSETS (mockup only, Phase 3)
E11: MOBILE (Phase 3)
├── 11.1 PWA (manifest, service worker, offline queue, camera/GPS)
├── 11.2 Capacitor APK (nếu stakeholder yêu cầu store)
└── 11.3 Push notification (FCM/Zalo) nếu cần
```

---

## 9. THIẾT KẾ CSDL — WORKER CLASSIFICATION

### 9.1. Mô hình 3 trục (thay thế workerCategory cũ)

**Vấn đề model cũ:** `workerCategory` có 5 giá trị nhưng trộn 3 khái niệm khác nhau: ai đưa worker vào (nguồn), ai trả lương (quan hệ lao động), làm việc kiểu gì (môi trường). Hệ quả: `THUENGOAI` không phân biệt được "HRP tự tuyển rồi thuê ngoài cho KH" vs "vendor cung ứng" — ảnh hưởng trực tiếp đến đối soát và hoa hồng.

```typescript
// 3 TRỤC ĐỘC LẬP
enum WorkerSourceType {
  HRP_DIRECT      = 'HRP_DIRECT',      // HRP tự tuyển (Sale/HR nhập, worker tự đăng ký)
  VENDOR_SUPPLIED = 'VENDOR_SUPPLIED', // Vendor cung ứng
  CTV_REFERRAL    = 'CTV_REFERRAL'     // CTV giới thiệu
}

enum EmploymentType {
  HRP_EMPLOYED = 'HRP_EMPLOYED',  // HRP trả lương (kể cả đi làm tại dự án KH)
  OUTSOURCED   = 'OUTSOURCED',    // Thuê ngoài — KH/đối tác trả lương, HRP đối soát công nợ
  REFERRED_OUT = 'REFERRED_OUT'   // Giới thiệu cho cty khác — HRP chỉ nhận hoa hồng
}

enum WorkSetting {                  // chỉ áp dụng khi HRP_EMPLOYED
  PHOTHONG  = 'PHOTHONG',          // Lao động phổ thông (KPI hours-based cho quản lý/CTV)
  VANPHONG  = 'VANPHONG',          // Văn phòng (KPI task-based)
  CONGXUONG = 'CONGXUONG'          // Công xưởng (không KPI, chấm máy)
}

enum WorkStatus {
  CHODUYET  = 'CHODUYET',    // Chờ duyệt hồ sơ
  DANG_RAIN = 'DANG_RAIN',   // Đang rảnh — TRONG POOL (chưa gán hoặc đã xong dự án)
  DANG_LAM  = 'DANG_LAM',    // Đang làm (đã gán dự án)
  TAMNGHI   = 'TAMNGHI',     // Tạm nghỉ
  NGHIVIEC  = 'NGHIVIEC',    // Nghỉ việc (terminal, có thể reactivate qua HR)
  BLACKLIST = 'BLACKLIST'    // Blacklist (terminal, vi phạm/bỏ việc ngang)
}
```

**Bảng quy đổi từ model cũ → mới:**

| workerCategory cũ | sourceType | employmentType | workSetting |
|---|---|---|---|
| VANHANH_PHOTHONG | HRP_DIRECT | HRP_EMPLOYED | PHOTHONG |
| VANHANH_VANPHONG | HRP_DIRECT | HRP_EMPLOYED | VANPHONG |
| VANHANH_CONGXUONG | HRP_DIRECT | HRP_EMPLOYED | CONGXUONG |
| THUENGOAI | HRP_DIRECT **hoặc** VENDOR_SUPPLIED | OUTSOURCED | — |
| GIOITHIEU_HH | CTV_REFERRAL | REFERRED_OUT | — |

### 9.2. Schema Worker & Assignment

```sql
CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,            -- "USR-001" (Primary UserID, tạo khi đăng ký, KHÔNG đổi)
  full_name TEXT,
  phone TEXT UNIQUE,
  cccd_number TEXT,
  cccd_image_url TEXT,                     -- storage nội địa (ADR-006)
  selfie_image_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  bank_account TEXT,
  bank_name TEXT,

  source_type TEXT NOT NULL,               -- HRP_DIRECT | VENDOR_SUPPLIED | CTV_REFERRAL
  source_vendor_id UUID REFERENCES vendors(id),
  source_ctv_id UUID REFERENCES users(id),
  registration_channel TEXT NOT NULL DEFAULT 'SALE_ADDED', -- SELF_REGISTER | SALE_ADDED | HR_ADDED | VENDOR_ADDED | CTV_ADDED

  employment_type TEXT NOT NULL,           -- HRP_EMPLOYED | OUTSOURCED | REFERRED_OUT
  work_setting TEXT,                       -- PHOTHONG | VANPHONG | CONGXUONG (nếu HRP_EMPLOYED)

  work_status TEXT NOT NULL DEFAULT 'CHODUYET',
  owner_id UUID REFERENCES users(id),      -- Sale/NVKD nhập/quản lý chính (data isolation)
  assigned_to_id UUID REFERENCES users(id),-- Người phụ trách hiện tại

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  employee_code TEXT NOT NULL,             -- "EMP-SAMSUNG-001" (Secondary UserID — do dự án tạo)
  assigned_date DATE NOT NULL,
  end_date DATE,                           -- null = đang làm
  is_active BOOLEAN DEFAULT TRUE,
  manager_id UUID REFERENCES users(id),    -- Quản lý (nhận KPI hours-based)
  referrer_id UUID REFERENCES users(id),   -- CTV giới thiệu (nhận hoa hồng/KPI)
  salary_per_day DECIMAL(12,2),            -- Lương thỏa thuận tại dự án này
  status TEXT DEFAULT 'ACTIVE',            -- ACTIVE | TRANSFERRED | ENDED
  transfer_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, employee_code)
);

-- Chỉ 1 assignment ACTIVE trên 1 worker (partial index)
CREATE UNIQUE INDEX idx_one_active_assignment
  ON project_assignments(worker_id) WHERE is_active;
```

### 9.3. Vòng đời trạng thái

```mermaid
stateDiagram-v2
  [*] --> CHODUYET: Đăng ký / vendor nhập / CTV giới thiệu
  CHODUYET --> DANG_RAIN: HR duyệt
  CHODUYET --> DANG_LAM: HR duyệt + gán dự án ngay
  CHODUYET --> NGHIVIEC: Từ chối hồ sơ
  CHODUYET --> BLACKLIST: Gian lận hồ sơ
  DANG_RAIN --> DANG_LAM: Gán dự án
  DANG_RAIN --> NGHIVIEC
  DANG_RAIN --> BLACKLIST: Vi phạm
  DANG_LAM --> DANG_RAIN: Kết thúc dự án
  DANG_LAM --> TAMNGHI: Xin nghỉ
  DANG_LAM --> NGHIVIEC
  DANG_LAM --> BLACKLIST: Bỏ việc ngang / vi phạm
  TAMNGHI --> DANG_LAM: Quay lại
  TAMNGHI --> DANG_RAIN
  TAMNGHI --> NGHIVIEC
  NGHIVIEC --> CHODUYET: Reactivate (HR quyết định)
  NGHIVIEC --> [*]
  BLACKLIST --> [*]
```

**Valid transitions (guard trong code, không chỉ UI):**

| Từ | Đến |
|----|-----|
| CHODUYET | DANG_RAIN, DANG_LAM, NGHIVIEC, BLACKLIST |
| DANG_RAIN | DANG_LAM, NGHIVIEC, BLACKLIST |
| DANG_LAM | DANG_RAIN, TAMNGHI, NGHIVIEC, BLACKLIST |
| TAMNGHI | DANG_LAM, DANG_RAIN, NGHIVIEC |
| NGHIVIEC | CHODUYET (reactivate, chỉ HR_MANAGER) |
| BLACKLIST | (terminal) |

### 9.4. Business Rules theo phân loại

| Rule | HRP_EMPLOYED | OUTSOURCED | REFERRED_OUT |
|------|--------------|------------|--------------|
| salarySource | HRP | KH/đối tác | Cty tiếp nhận |
| payslipVisible | ✓ | ✗ | ✗ |
| advanceRequest (tạm ứng) | ✓ | ✗ | ✗ |
| attendance | MACHINE + GPS | GPS (ý thức) + file công đối tác | GPS (ý thức) |
| vendorBilling | ✗ | ✓ (theo rate card) | ✗ (chỉ hoa hồng CTV) |
| kpiRequired | theo workSetting (mục 9.5) | ✗ | ✗ |

### 9.5. KPI Rules (chỉ HRP_EMPLOYED)

| workSetting | Cách đo | Ai nhận KPI |
|-------------|---------|-------------|
| PHOTHONG | **HOURS_BASED**: giờ công thực tế / giờ quy định | Quản lý dự án (managerId) và/hoặc CTV giới thiệu (referrerId) — 1 giờ = 1 KPI point |
| VANPHONG | **TASK_BASED**: task hoàn thành / task giao | Chính worker, do quản lý đánh giá |
| CONGXUONG | Không KPI | — |

### 9.6. Talent Pool & Data Isolation

**Định nghĩa "Đang rảnh" (DANG_RAIN):** worker đã đăng ký/được nhập, chưa gán dự án nào HOẶC đã xong dự án cũ. **Đây là trạng thái, không phải loại lao động.**

**Visibility Matrix (thay thế rule đơn lẻ của v1):**

| Role | Workers nhìn thấy |
|------|-------------------|
| ADMIN, HR_MANAGER | Toàn bộ |
| HR_STAFF | Toàn bộ (hoặc theo phân công — [CẦN CHỐT]) |
| SALE / NVKD | `ownerId = mình` HOẶC `assignedToId = mình` |
| PM | Worker có assignment ACTIVE thuộc project mình quản lý |
| VENDOR | `sourceVendorId = vendor của mình` |
| CTV | `sourceCtvId = mình` |
| WORKER | Chỉ bản thân |

```typescript
// Query scoping utility — MỌI query worker phải đi qua hàm này
function workerScope(user: SessionUser) {
  switch (user.role) {
    case 'ADMIN':
    case 'HR_MANAGER': return {};
    case 'HR_STAFF':   return {}; // hoặc theo phân công [CẦN CHỐT]
    case 'SALE':       return { OR: [{ ownerId: user.id }, { assignedToId: user.id }] };
    case 'PM':         return { assignments: { some: { isActive: true, project: { managerId: user.id } } } };
    case 'VENDOR':     return { sourceVendorId: user.vendorId };
    case 'CTV':        return { sourceCtvId: user.id };
    default:           return { id: 'DENY_ALL' }; // deny by default
  }
}
```

> **Defense in depth:** áp dụng thêm Postgres Row-Level Security (Phase 2) — không chỉ dựa vào convention code.

### 9.7. UserID Primary/Secondary

- **Primary UserID** (`workers.user_id`): tạo khi đăng ký, định danh suốt đời worker, không đổi.
- **Secondary UserID** (`project_assignments.employee_code`): mã nhân viên tại dự án (do khách hàng/xưởng tạo theo format riêng, vd "EMP-SAMSUNG-001"), dùng cho chấm công & đối soát. Khi chuyển dự án → đóng assignment cũ, tạo assignment mới với mã mới.
- **KPI/hoa hồng:** tính theo assignment — giờ công thuộc khoảng thời gian assignment nào thì ghi cho manager/CTV của assignment đó.

**Ví dụ:** Worker A: Primary `USR-001`; gán Samsung từ 01/08 với `EMP-SAMSUNG-001` (manager #10, CTV #5) → chuyển LG ngày 15/08 với `EMP-LG-001` (manager #20). Công 01–14/08 tính KPI cho #5/#10; công từ 15/08 tính cho #20.

### 9.8. Transfer Flow (transaction + advisory lock)

```typescript
interface TransferWorkerRequest {
  workerId: string;
  fromProjectId: string;
  toProjectId: string;
  newEmployeeCode: string;
  newManagerId: string;
  newReferrerId?: string | null;
  transferDate: Date;
  reason: string;
}

async function transferWorker(req: TransferWorkerRequest, actorId: string) {
  return await prisma.$transaction(async (tx) => {
    // Khóa worker trong transaction (tránh 2 thao tác chuyển song song)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.workerId}))`;

    // 1. Đóng assignment cũ
    const closed = await tx.projectAssignment.updateMany({
      where: { workerId: req.workerId, projectId: req.fromProjectId, isActive: true },
      data: { isActive: false, endDate: req.transferDate, status: 'TRANSFERRED', transferReason: req.reason }
    });
    if (closed.count === 0) throw new Error('Không có assignment active để chuyển');

    // 2. Tạo assignment mới
    const created = await tx.projectAssignment.create({
      data: {
        workerId: req.workerId,
        projectId: req.toProjectId,
        employeeCode: req.newEmployeeCode,
        managerId: req.newManagerId,
        referrerId: req.newReferrerId,
        assignedDate: req.transferDate,
        isActive: true,
        status: 'ACTIVE'
      }
    });

    // 3. Cập nhật worker + audit log
    await tx.worker.update({ where: { id: req.workerId }, data: { workStatus: 'DANG_LAM' } });
    await tx.auditLog.create({
      data: {
        action: 'WORKER_TRANSFER', actorId,
        workerId: req.workerId,
        detail: { fromProject: req.fromProjectId, toProject: req.toProjectId, reason: req.reason }
      }
    });
    return created;
  });
}
```

---

## 10. HỢP ĐỒNG, RATE CARD & CHÍNH SÁCH HOA HỒNG

> v1 có tính năng "Contract Mgmt" nhưng không có thiết kế dữ liệu. Đối soát vendor (G-02) và tính lương **không thể làm được** nếu không có 3 entity này.

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_no TEXT NOT NULL,
  type TEXT NOT NULL,          -- WORKER_LABOR | CLIENT_SUPPLY | VENDOR_FRAMEWORK
  party_id UUID NOT NULL,      -- workers.id | clients.id | vendors.id
  sign_date DATE,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'ACTIVE',-- DRAFT | ACTIVE | EXPIRED | TERMINATED
  file_url TEXT,               -- bản scan (storage nội địa)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rate_cards (       -- Đơn giá B2B cho đối soát vendor / hóa đơn client
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  rate_type TEXT NOT NULL,     -- HOURLY | DAILY | MONTHLY | PER_HEAD
  price DECIMAL(14,2) NOT NULL,
  currency TEXT DEFAULT 'VND',
  effective_from DATE NOT NULL,
  effective_to DATE,           -- null = đang áp dụng
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commission_policies (  -- Chính sách hoa hồng CTV
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  calc_type TEXT NOT NULL,     -- PER_HOUR | PER_HEAD | PERCENT_SALARY [CẦN CHỐT]
  value DECIMAL(14,2) NOT NULL,   -- vd: 5.000đ/giờ, 300.000đ/đầu người, 5%
  conditions JSONB,            -- vd: {"minWorkingMonths": 1, "capPerMonth": ...}
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commission_records (  -- Kết quả tính hoa hồng từng kỳ
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ctv_id UUID NOT NULL REFERENCES users(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  policy_id UUID NOT NULL REFERENCES commission_policies(id),
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  basis_value DECIMAL(14,2),   -- giờ công / đầu người / lương cơ sở
  amount DECIMAL(14,2) NOT NULL,
  status TEXT DEFAULT 'PENDING',-- PENDING | APPROVED | PAID
  UNIQUE(ctv_id, worker_id, month, year)
);
```

---

## 11. KIẾN TRÚC VENDOR PORTAL

### 11.1. Subdomain trên cùng app (ADR-003)

```typescript
// app/middleware.ts — ví dụ route theo hostname
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  if (host.startsWith('vendor.')) {
    // Viết lại /(vendor)/* — giữ nguyên URL hiển thị vendor.hrpartner.vn
    return NextResponse.rewrite(new URL(`/vendor${req.nextUrl.pathname}`, req.url));
  }
}
```

- Domain: `vendor.hrpartner.vn` (wildcard DNS + Vercel auto SSL)
- Role: `VENDOR_ADMIN` / `VENDOR_STAFF` — data scope mặc định `sourceVendorId = vendor của mình`
- Cùng 1 DB, cùng auth JWT, khác giao diện

### 11.2. Vendor User Flow

1. **Login** tại `vendor.hrpartner.vn` → JWT + role VENDOR_*
2. **Dashboard**: tổng NLĐ đã gửi, số duyệt/từ chối/chờ, thu nhập ước tính
3. **Xem dự án đang tuyển** (project có `isPublic = true` + còn quota): tên, số lượng cần, yêu cầu, địa điểm, ngày bắt đầu → lọc theo khu vực/ngành
4. **Nhập NLĐ**: form Họ tên*, SĐT*, Ngày sinh, Giới tính, CCCD, khu vực, kinh nghiệm, ảnh CCCD → tạo Worker với `sourceType = VENDOR_SUPPLIED`, `sourceVendorId = vendor`, `employmentType = OUTSOURCED` (mặc định, HR có thể sửa), `workStatus = CHODUYET`
5. **Theo dõi trạng thái**: CHỜ DUYỆT / ĐƯỢC DUYỆT / TỪ CHỐI (kèm lý do) + thông báo khi có cập nhật
6. **Đối soát (Phase 2)**: tổng ngày công, đơn giá theo rate card, tổng tiền, xuất biên bản

### 11.3. Feature Flags cho Worker nguồn Vendor

```typescript
const VENDOR_WORKER_RESTRICTIONS = {
  hiddenFeatures: ['SALARY_SLIP', 'ADVANCE_REQUEST', 'TIMEKEEPING_MACHINE'],
  visibleFeatures: ['PROJECT_INFO', 'ATTENDANCE_GPS', 'ATTENDANCE_HISTORY', 'FEEDBACK']
};
```

---

## 12. CHẤM CÔNG & ĐỐI SOÁT

### 12.1. Hai luồng tách bạch (nguyên tắc xuyên suốt)

| | File chấm công từ đối tác | GPS Check-in |
|---|---|---|
| Nguồn | Đối tác tự chấm, gửi Excel/PDF | Worker tự check-in qua app |
| Mục đích | **TÍNH LƯƠNG** + KPI + đối soát vendor | **QUẢN LÝ Ý THỨC** (không dùng tính lương) |
| Xử lý | Kế toán import → approve → tính lương | Lưu history → phát hiện không check-in |

### 12.2. GPS Check-in (Phase 1b)

1. Worker nhấn "CHECK-IN" hàng ngày
2. Chụp selfie (camera trước) + lấy GPS (tọa độ, accuracy)
3. `POST /api/v1/attendance/checkin` — `workerId` lấy từ JWT (KHÔNG từ body)
4. Server validate: **geofence theo dự án** (khoảng cách tới site ≤ bán kính cho phép, mặc định 200m — [CẦN CHỐT theo từng dự án]) + accuracy ≤ 100m
5. Admin xem log, đối chiếu người không check-in

**Offline-first:** nếu không có mạng → lưu local (IndexedDB) kèm timestamp thiết bị → tự retry khi có mạng. Server chấp nhận timestamp quá khứ trong khoảng 24h.

### 12.3. Import File Chấm công (Phase 2)

1. **Upload** `.xlsx/.xls/.csv` (ưu tiên hỗ trợ cả PDF sau) → tạo `import_batches`
2. **Template profile per partner** — mỗi đối tác 1 cấu hình mapping cột riêng (không hard-code "Mã NV | Họ tên | Ngày | Giờ vào | Giờ ra")
3. **Auto-map** employeeCode → worker → validate (worker tồn tại? đúng dự án? date hợp lệ?)
4. **Review & approve**: kế toán xem dòng lỗi/unmatched → chọn kỳ lương → confirm
5. **Auto-calc**: lương → KPI → payslip (mục 12.5, 12.6)

### 12.4. Webhook Máy chấm công (Phase 2)

- **[CẦN CHỐT] Hãng máy & protocol** (Ronald Jack / ZKTeco / ...; HTTP Push / ADMS / SDK) — khảo sát ngay Sprint 9, vì đây là tích hợp rủi ro nhất
- Chiến lược: **pilot với 1 xưởng** trước khi chuẩn hóa; thiết kế adapter pattern để đổi hãng máy không phá core
- Dữ liệu vào cùng bảng `attendance_records` với `source = 'MACHINE'`

### 12.5. Tính Lương (luật VN — Phase 2)

**Công thức cơ bản:**

```
Gross = Ngày công × lương ngày (theo assignment)
      + OT ngày thường × (lương giờ × 1.5)
      + OT nghỉ hằng tuần × (lương giờ × 2.0)
      + OT lễ/Tết × (lương giờ × 3.0)
      + Phụ cấp khác [CẦN CHỐT danh mục]

Các khoản trừ bắt buộc (NLĐ chịu):
  BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5% × lương đóng BH
  (lương đóng BH ≥ lương tối thiểu vùng — [CẦN CHỐT] mức đóng thực tế với kế toán)
TNCN = (Thu nhập chịu thuế − Giảm trừ bản thân 11tr − 4.4tr/người phụ thuộc)
       × biểu thuế lũy tiến (5%–35%)
Net = Gross − BH − TNCN
```

```typescript
async function calculatePayroll(workerId: string, projectId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  // 1. Lấy công trong tháng (source: IMPORTED | MACHINE | MANUAL)
  const attendance = await prisma.attendanceRecord.findMany({
    where: { workerId, projectId, workDate: { gte: start, lte: end } }
  });

  // 2. Lấy assignment để biết lương ngày + manager/CTV tại dự án này
  const assignment = await prisma.projectAssignment.findFirst({
    where: { workerId, projectId, assignedDate: { lte: end },
            OR: [{ endDate: null }, { endDate: { gte: start } }] }
  });

  const totalDays = attendance.length;
  const base = totalDays * assignment.salaryPerDay.toNumber();
  const hourlyRate = assignment.salaryPerDay.toNumber() / 8;
  const overtime = attendance.reduce((sum, r) =>
    sum + r.overtimeHours.toNumber() * hourlyRate * r.overtimeRate.toNumber(), 0);

  const gross = base + overtime;
  const socialInsurance = insuranceBase(gross) * 0.105; // BHXH 8 + BHYT 1.5 + BHTN 1
  const tax = personalIncomeTax(gross - socialInsurance - familyDeduction(workerId));

  return {
    workerId, projectId, month, year,
    totalDays, base, overtime, gross,
    socialInsurance, tax,
    net: gross - socialInsurance - tax
  };
}

// Lưu kết quả + khóa kỳ lương (payroll lock)
async function lockPayroll(projectId: string, month: number, year: number, actorId: string) {
  return await prisma.$transaction(async (tx) => {
    const locked = await tx.payrollRecord.updateMany({
      where: { projectId, month, year, status: 'DRAFT' },
      data: { status: 'LOCKED' }
    });
    await tx.auditLog.create({ data: { action: 'PAYROLL_LOCK', actorId,
      detail: { projectId, month, year, affected: locked.count } } });
    return locked.count;
  });
}
```

### 12.6. KPI Calculation (sửa lỗi v1: theo khoảng thời gian, không dùng isActive)

```typescript
async function calculateKPIForManager(managerId: string, month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  // Assignment GIAO NHAU với tháng đang tính — kể cả đã TRANSFERRED/ENDED
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      OR: [{ managerId }, { referrerId }],
      assignedDate: { lte: end },
      OR: [{ endDate: null }, { endDate: { gte: start } }]
    }
  });

  let total = 0;
  const breakdown = [];
  for (const a of assignments) {
    // Chỉ tính giờ công trong phần GIAO NHAU giữa tháng và assignment
    const overlapStart = a.assignedDate > start ? a.assignedDate : start;
    const overlapEnd = a.endDate && a.endDate < end ? a.endDate : end;
    const hours = await getWorkerHours(a.workerId, a.projectId, overlapStart, overlapEnd);
    total += hours;
    breakdown.push({ workerId: a.workerId, projectId: a.projectId, hours });
  }

  await prisma.kpiRecord.upsert({
    where: { userId_month_year: { userId: managerId, month, year } },
    update: { totalKpi: total, breakdown },
    create: { userId: managerId, month, year, totalKpi: total, breakdown }
  });
  return { managerId, month, year, totalKpi: total, breakdown };
}
```

### 12.7. Schema (đã sửa lỗi v1)

```sql
-- GPS CHECK-IN LOG (ý thức)
CREATE TABLE gps_checkin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  gps_accuracy DECIMAL(5,2),
  selfie_image_url TEXT NOT NULL,
  checkin_time TIMESTAMPTZ NOT NULL,     -- thời điểm chụp trên thiết bị (offline-tolerant)
  work_date DATE NOT NULL,
  device_info JSONB,
  status TEXT DEFAULT 'ACTIVE',          -- ACTIVE | INVALID (out of geofence...)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gps_worker_date ON gps_checkin_logs (worker_id, work_date);

-- ATTENDANCE RECORD (tính lương — từ import/máy/sửa tay)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  assignment_id UUID REFERENCES project_assignments(id),
  work_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  hours_worked DECIMAL(5,2),
  is_late BOOLEAN DEFAULT FALSE,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  overtime_rate DECIMAL(3,2) DEFAULT 1.5,   -- 1.5 | 2.0 | 3.0
  source TEXT DEFAULT 'IMPORTED',           -- IMPORTED | MACHINE | MANUAL
  import_batch_id UUID REFERENCES import_batches(id),
  UNIQUE(worker_id, project_id, work_date)
);

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  partner_template_id UUID,                -- template mapping cột của đối tác
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING',           -- PENDING | VALIDATED | APPROVED | REJECTED
  imported_count INTEGER,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL RECORD — unique GỒM project_id (worker có thể 2 dự án 1 tháng khi chuyển)
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  total_days DECIMAL(5,2), total_hours DECIMAL(6,2), overtime_hours DECIMAL(5,2),
  base_salary DECIMAL(14,2), overtime_pay DECIMAL(14,2), total_salary DECIMAL(14,2),
  tax DECIMAL(14,2), insurance DECIMAL(14,2), net_salary DECIMAL(14,2),
  status TEXT DEFAULT 'DRAFT',             -- DRAFT | LOCKED | PAID
  UNIQUE(worker_id, project_id, month, year)
);

CREATE TABLE kpi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month INTEGER NOT NULL, year INTEGER NOT NULL,
  total_kpi DECIMAL(10,2),
  breakdown JSONB,
  UNIQUE(user_id, month, year)
);
```

### 12.8. API Endpoints (tóm tắt)

| Module | Endpoint | Method | Ghi chú |
|--------|----------|--------|---------|
| Auth | `/api/auth/send-otp` / `/verify-otp` / `/refresh` | POST | Rate limit: 3 OTP/phút |
| Check-in | `/api/attendance/checkin` | POST | **workerId từ JWT**, body: selfie + GPS |
| Check-in | `/api/attendance/history` | GET | Của chính worker (JWT) |
| Admin GPS | `/api/admin/attendance/gps-logs` | GET | Filter project/worker/date |
| Import | `/api/attendance/import` | POST | Upload file → batchId |
| Import | `/api/attendance/import/validate` / `/approve` | POST | Mapping + kỳ lương |
| Payroll | `/api/payroll/calculate` | POST | Enqueue QStash (bulk) |
| Payroll | `/api/payroll/summary` | GET | Theo project/tháng |
| KPI | `/api/kpi/report` | GET | Theo manager/tháng |

---

## 13. TECH STACK & ENVIRONMENT

### 13.1. Technology Stack (thống nhất — thay thế bảng v1)

| Layer | Technology | Ghi chú |
|-------|------------|---------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript | Cả 3 cổng: worker/admin/vendor |
| UI Components | TailwindCSS + shadcn/ui | |
| Admin charts | Recharts | |
| Backend | Next.js Route Handlers (Serverless) | **Không dùng Fastify** |
| ORM | Prisma (+ driver adapter nếu cần) | |
| Database | PostgreSQL (Neon serverless → self-host VN) | JSONB, PostGIS |
| Cache | Upstash Redis | Session, rate limit, cache |
| Queue | Upstash QStash | Payroll bulk, notifications |
| Storage | **Cloudflare R2** (S3-compatible, không tính egress) | Ảnh CCCD + selfie: bắt buộc nội địa (ADR-006); hợp đồng: khuyến nghị nội địa |
| Auth | OTP SMS + JWT + **Zalo Login** + device binding | Zalo OA API đăng nhập 1 chạm (ADR-007b) |
| SMS | Viettel/VNPT/eSMS/SpeedSMS [CẦN CHỐT nhà cung cấp] | |
| Zalo OA | Zalo Login + Zalo Notification | Đăng nhập 1 chạm, thông báo cho worker |
| Mobile | **PWA trước** → Capacitor nếu cần | ADR-008 |
| CI/CD | GitHub Actions + Vercel | Preview per PR |
| Monitoring | Sentry (+ Vercel Analytics) | Phase 2 hoàn thiện |

### 13.2. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/hrp?sslmode=require"
DATABASE_POOL_URL="postgresql://user:pass@xxx-pooler.neon.tech/hrp"   # pooler port (Supavisor)

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx

# Queue (QStash)
QSTASH_TOKEN=xxx

# JWT
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx          # access 15', refresh 7d

# SMS Gateway
SMS_API_KEY=xxx
SMS_PROVIDER=viettel|vnpt|esms

# Zalo OA (Zalo Login & Notifications)
ZALO_APP_ID=xxx
ZALO_APP_SECRET=xxx
ZALO_OA_ID=xxx                  # Official Account ID
ZALO_CALLBACK_URL=https://hrpartner.vn/api/auth/zalo/callback

# Storage nội địa (Cloudflare R2 — S3-compatible, không tính egress)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY=xxx
R2_SECRET_KEY=xxx
R2_BUCKET=hrp-uploads
# Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com/hrp-uploads

# App URLs
NEXT_PUBLIC_APP_URL=https://hrpartner.vn
VENDOR_URL=https://vendor.hrpartner.vn
```

---

## 14. SERVERLESS BEST PRACTICES

### 14.1. Database Connection Pooling

**Vấn đề:** serverless functions tạo connection mới mỗi invocation → exhaust pool nhanh.
**Giải pháp:** dùng pooler URL (Supavisor port 6543 / Neon pooler) cho runtime; URL trực tiếp chỉ dùng khi chạy migration. Prisma client singleton theo chuẩn serverless:

```typescript
import { PrismaClient } from '@prisma/client'
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 14.2. Transactions & Locking

**Nguyên tắc:** mọi ghi nhiều bảng phải dùng `$transaction`.

> ⚠️ Lưu ý sửa lỗi v1: Prisma `$transaction` **KHÔNG hỗ trợ option `isolationLevel`**. Các đoạn cần isolation cao dùng **Postgres advisory lock** trong transaction (mặc định Read Committed + khóa tường minh là đủ cho nghiệp vụ này):

```typescript
async function assignWorkerToProject(workerId: string, projectId: string, actorId: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${workerId}))`;

    const worker = await tx.worker.findUniqueOrThrow({ where: { id: workerId } });
    if (!['CHODUYET', 'DANG_RAIN'].includes(worker.workStatus)) {
      throw new Error('Worker không trong trạng thái có thể gán');
    }

    const assignment = await tx.projectAssignment.create({ /* ... */ });
    await tx.worker.update({ where: { id: workerId }, data: { workStatus: 'DANG_LAM' } });
    await tx.auditLog.create({ data: { action: 'WORKER_ASSIGNED', actorId, workerId, projectId } });
    return assignment;
  });
}
```

### 14.3. Idempotency Keys (chống duplicate khi client retry)

```typescript
model IdempotencyKey {
  id        String   @id              // key từ client
  response  Json?
  status    String                    // PENDING | COMPLETED | FAILED
  createdAt DateTime @default(now())
  expiresAt DateTime                  // TTL + cleanup job
  @@index([expiresAt])
}

// API POST bắt buộc header x-idempotency-key
// PENDING đang xử lý → 409; COMPLETED → trả cached response; FAILED → cho phép retry
```

### 14.4. Optimistic Concurrency Control (quota tuyển dụng)

> Sửa lỗi v1: dùng `updateMany` với `where` có version (hợp lệ với Prisma), kiểm tra `count`:

```typescript
async function allocateWorkerToProject(projectId: string, workerId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    if (project.filled >= project.quota) throw new Error('Project quota exceeded');

    const updated = await prisma.project.updateMany({
      where: { id: projectId, version: project.version },   // OCC check
      data: { filled: { increment: 1 }, version: { increment: 1 } }
    });
    if (updated.count === 1) return;  // thành công
    await new Promise(r => setTimeout(r, 100 * (attempt + 1))); // conflict → retry
  }
  throw new Error('Concurrent update conflict');
}
```

### 14.5. Background Processing (QStash)

- Tính lương hàng loạt, gửi thông báo → enqueue QStash (retries 3, delay tùy chọn)
- Job handler là 1 route handler riêng; xử lý theo batch (100/batch) tránh quá memory/timeout
- Endpoint polling tiến độ: `GET /api/jobs/:jobId`

### 14.6. Caching Strategy

| Dữ liệu | Cơ chế | TTL | Invalidation |
|---------|--------|-----|--------------|
| Job board (public) | ISR `revalidate = 300` + Redis | 5' | Khi project đổi trạng thái/quota |
| Profile worker | Redis | 1h | `invalidateWorkerCache(workerId)` khi update |
| Danh sách dự án cho vendor | Redis | 5' | Khi project update |

---

## 15. BẢO MẬT

```typescript
const SECURITY_CONFIG = {
  // Authentication
  otpExpiryMinutes: 5,
  otpMaxAttempts: 3,
  jwtAccessExpiryMinutes: 15,
  jwtRefreshExpiryDays: 7,
  maxDevicesPerUser: 3,             // device binding (ADR-007)

  // Rate limiting
  otpRequestPerMinute: 3,
  checkinPerHour: 4,
  loginAttemptsPerMinute: 5,

  // Data protection
  cccdImageEncryption: true,        // at-rest (server-side encryption của storage) + URL signed có TTL
  selfieMinQuality: 0.7,
  gpsAccuracyThresholdMeters: 100,

  // Compliance
  dataRetentionDays: 365 * 2,       // lưu trữ theo luật lao động
  auditLogRetention: 365 * 5,
};
```

- **Dữ liệu sinh trắc học** (selfie) & CCCD: lưu storage nội địa ngay từ Phase 1 (ADR-006); truy cập qua signed URL có TTL; audit log mọi lượt xem dữ liệu nhạy cảm.
- **Data isolation:** mọi query đi qua `workerScope()` (mục 9.6) + Postgres RLS (Phase 2).
- **Compliance:** Nghị định 13/2023/NĐ-CP (bảo vệ dữ liệu cá nhân), Luật Dữ liệu 2024 (hiệu lực 01/07/2025), Nghị định 53/2022/NĐ-CP + Luật An ninh mạng 2018 (lưu trữ nội địa).

---

## 16. CHIẾN LƯỢC TESTING

| Loại | Phạm vi | Công cụ |
|------|---------|---------|
| **Golden tests (bắt buộc)** | Payroll, KPI, commission — case thật do kế toán cung cấp (≥ 10 case: đủ tháng, giữa tháng chuyển dự án, OT lễ, phụ thuộc giảm trừ...) | Vitest |
| Unit | Domain logic: transitions, geofence, import mapping | Vitest |
| Integration | Transfer worker, assign + quota (OCC), import flow | Vitest + test DB (Neon branch) |
| E2E smoke | Đăng ký → apply → gán dự án → check-in → tính lương | Playwright |
| CI | Chạy toàn bộ test mỗi PR; migration test trên Neon branch | GitHub Actions |

**Nguyên tắc:** M8 (Payroll) không có golden tests thì không được merge. Neon branching dùng để test thuật toán lương trên dữ liệu thật (đã được copy/anonymize).

---

## 17. RỦI RO & MITIGATION

| ID | Risk | Impact | Prob. | Mitigation |
|----|------|--------|-------|------------|
| R1 | GPS không chính xác trong nhà | High | Medium | WiFi positioning, accuracy threshold, geofence linh hoạt theo dự án |
| R2 | OTP SMS delay/blocked | High | Medium | Fallback voice call, retry, đa nhà cung cấp SMS |
| R3 | Worker không cung cấp đủ thông tin | Medium | Medium | Profile completion reminders, HR follow-up |
| R4 | Vendor nhập thông tin sai | Medium | High | HR review workflow, validation rules |
| R5 | Máy chấm công offline | High | Medium | SOP điều chỉnh công thủ công (F-06) |
| R6 | Worker không có smartphone | Medium | Low | Kiosk mode tại văn phòng HRP, HR hỗ trợ nhập hộ |
| R7 | Data privacy (CCCD, selfie) | **High** | Medium | Storage nội địa từ Phase 1, mã hóa, signed URL, audit log; tuân thủ NĐ 13/2023 + Luật Dữ liệu 2024 |
| R8 | Performance với 10k+ workers | Medium | Medium | Pagination, indexing, caching, pooler |
| R9 | Sim swap / lừa đảo OTP | High | Medium | Device binding, maxDevicesPerUser, cảnh báo thiết bị lạ |
| R10 | Protocol máy chấm công không rõ | High | Medium | Khảo sát hãng máy ngay Sprint 9, adapter pattern, pilot 1 xưởng |
| R11 | Format Excel đối tác biến động | Medium | High | Template profile per partner, preview trước khi approve |
| R12 | Payroll tính sai | **High** | Medium | Golden tests với case thật, payroll lock, audit log, so sánh song song với Excel trong 2 kỳ đầu |
| R13 | Quota đăng ký vượt (dự án hot) | Medium | Low | OCC (mục 14.4) |

---

## 18. LỘ TRÌNH HẠ TẦNG

> **Định hướng:** chuyển đổi linh hoạt Serverless (tốc độ) → Cloud Server VN (sở hữu + tuân thủ pháp lý).

```mermaid
flowchart LR
  G1["GĐ1: MVP<br/>Vercel Hobby + Neon Free<br/>+ Storage nội địa<br/>$0-5/tháng"]
  G2["GĐ2: Production<br/>Vercel Pro + Neon Pro<br/>+ Upstash + Sentry<br/>~$60-90/tháng"]
  G3["GĐ3: Ownership<br/>VPS VN + Coolify<br/>~$70-120/tháng<br/>+ chi phí vận hành"]
  G1 --> G2 --> G3
```

### 18.1. Giai đoạn 1: MVP (chi phí ~$0–5/tháng)

| Component | Lựa chọn | Lưu ý |
|-----------|----------|-------|
| Frontend + API | Vercel Hobby ($0) | Dev/test + demo; **không đủ cho production traffic** |
| Database | Neon Free ($0) | 0.5GB; dùng Neon branch test payroll |
| Storage | **Cloudflare R2** (~$2–5/tháng) | Bắt buộc cho CCCD/selfie (ADR-006) |
| SMS | Pay-per-use (~300–500đ/OTP) | [CẦN CHỐT] nhà cung cấp |

> ⚠️ Sửa lỗi v1: hạn mức Vercel Hobby **không phải** "100 invocations/day" — thực tế là ~100 GB-h functions/tháng. Kiểm tra lại bảng giá Vercel tại thời điểm triển khai trước khi dựa vào con số nào.

### 18.2. Giai đoạn 2: Production (~$60–90/tháng)

| Component | Lựa chọn | Chi phí | Ghi chú |
|-----------|----------|---------|---------|
| Hosting | Vercel Pro | $20/mo | Timeout dài hơn cho payroll; ~1M invocations (kiểm tra giá hiện hành) |
| Database | Neon Pro | $25/mo | 4GB + Supavisor pooler (bắt buộc cho payday traffic) |
| Cache/Queue | Upstash Redis + QStash | ~$15–25/mo | Rate limit + queue |
| Monitoring | Sentry | $0–26/mo | Free tier đủ |
| SMS | Gói bulk | ~$20/mo | ~10.000 OTP |
| Storage | Cloudflare R2 (S3-compatible) | ~$5/mo | |

### 18.3. Giai đoạn 3: Self-host VN (~$70–120/tháng + vận hành)

- **VPS VN:** VNG Cloud / Viettel IDC / Bizfly — 4 vCPU, 8GB RAM (~$50–100/mo)
- **PaaS:** Coolify (git push → auto deploy, SSL Let's Encrypt, backup DB)
- **Database:** PostgreSQL trên VPS hoặc Managed DB nội địa
- **Lý do:** Nghị định 53/2022/NĐ-CP + Luật An ninh mạng (lưu trữ nội địa), ping < 20ms cho 4G khu công nghiệp, không phụ thuộc pricing tier
- **Chi phí vận hành thật:** + ~0.5 FTE dev/ops (backup, patch, sự cố) — **v1 chưa tính khoản này**

### 18.4. So sánh chi phí 24 tháng (trung thực)

| Khoản | GĐ2 (Vercel+Neon) | GĐ3 (Self-host) |
|-------|-------------------|-----------------|
| Hạ tầng | ~$90 × 24 = $2,160 | ~$100 × 24 = $2,400 |
| Nhân lực vận hành | ~0 (managed) | ~0.5 FTE (tùy lương thực tế) |
| Rủi ro compliance | Dữ liệu ngoài VN (đã giảm nhờ storage nội địa) | Tuân thủ đầy đủ |
| Kết luận | Rẻ hơn trong ngắn hạn | **Chỉ có lợi khi đã có nhân lực kiêm vận hành** hoặc bắt buộc pháp lý |

> Kết luận trung thực: self-host **không rẻ hơn** trên giấy — giá trị nằm ở compliance và kiểm soát. Chỉ chuyển GĐ3 khi (1) bắt buộc pháp lý với client, (2) đã có người vận hành, hoặc (3) traffic đủ lớn khiến managed services tăng giá phi tuyến.

### 18.5. Migration Checklist (Neon → VPS)

**Trước 1–2 tuần:** backup đầy đủ; test restore trên Docker local; rà env vars; giảm TTL DNS; thông báo downtime; rollback plan.
**Ngày migration:** stop write (maintenance mode) → `pg_dump -Fc` → scp → `pg_restore` → verify row counts → update DATABASE_URL trên Coolify → restart → test login/attendance/payroll → switch DNS → monitor 2–4h.
**Sau 48–72h:** monitor performance; verify backup tự động; test restore; **giữ Neon 7 ngày** trước khi hủy; cập nhật tài liệu.

---

## 19. OPEN QUESTIONS [CẦN CHỐT]

| # | Câu hỏi | Ảnh hưởng | Phương án mặc định (AI có thể dùng) |
|---|---------|-----------|--------------------------------------|
| 1 | Hãng máy chấm công đang dùng? Protocol (HTTP Push/ADMS/SDK)? | M7 — tích hợp rủi ro nhất | Khảo sát Sprint 9; adapter pattern |
| 2 | Chính sách hoa hồng CTV cụ thể (theo giờ/đầu người/% lương, điều kiện)? | M6, M8 | PER_HOUR 5.000đ, trả sau khi NLĐ làm ≥ 1 tháng |
| 3 | Đơn giá B2B hiện quản lý ở đâu (Excel?) → thiết kế rate card | M8 đối soát | Rate card theo hợp đồng khung |
| 4 | Mức lương đóng BHXH thực tế? Các phụ cấp? | M8 tính lương | Đóng theo lương tối thiểu vùng |
| 5 | Có dùng eKYC xác thực CCCD không? Nhà cung cấp (FPT/VNPT)? | M2 đăng ký | Chưa dùng ở MVP; QR CCCD chip trước |
| 6 | Số lượng worker dự kiến 12 tháng tới? | Chọn hạ tầng | 2.000–5.000 |
| 7 | Bao nhiêu vendor đối tác? Cần tài khoản cho bao nhiêu? | M4 | 5–10 |
| 8 | Ai duyệt tạm ứng? Hạn mức (% lương đã chốt)? | M7 ticket | HR_MANAGER, ≤ 50% lương tháng trước |
| 9 | File chấm công mẫu từ 2–3 đối tác (để thiết kế import template) | M7 import | Thu thập Sprint 9 |
| 10 | Bán kính geofence mỗi dự án? | M2 GPS | 200m mặc định, config theo dự án |
| 11 | Payslip gửi thế nào (xem app / Zalo / PDF)? | M8 | Xem trong app + tải PDF |
| 12 | HR_STAFF có thấy toàn bộ pool hay theo phân công? | M5 isolation | Theo phân công (giống SALE) |
| 13 | **Zalo OA đã xác thực (tích vàng) chưa?** | A-01b block hoàn toàn nếu chưa có | Sprint 1 tuần 1 — chuẩn bị PLĐK + nộp xác thực |
| 14 | Có cần fallback OTP khi Zalo Login không hoạt động không? | UX/Support | Có — luôn có plan B (OTP-only) |

---

## 20. GLOSSARY

| Term | Definition |
|------|------------|
| **HRP** | Human Resources Portal — Nền tảng quản trị nhân sự |
| **B2B / B2C / B2O** | Business to Business / Consumer / Operations |
| **CTV** | Cộng tác viên — Referrer/Recruiter partner |
| **Vendor** | Đối tác cung ứng nhân lực (sửa lỗi v1: không phải "VPN") |
| **BCC** | Bảng chấm công — Time & Attendance record |
| **T&A** | Time & Attendance — Chấm công |
| **RBAC** | Role-Based Access Control — Phân quyền theo vai trò |
| **RLS** | Row-Level Security (Postgres) — bảo vệ data isolation ở tầng DB |
| **OTP** | One-Time Password — Mật khẩu dùng một lần |
| **CCCD** | Căn cước công dân — Vietnamese ID card |
| **ADR** | Architecture Decision Record — ghi chép quyết định kiến trúc |
| **PWA** | Progressive Web App — web app cài được, chạy offline |
| **MD** | Man-day — ngày công phát triển (đơn vị effort) |
| **Golden test** | Test với case thật + kết quả đúng do nghiệp vụ cung cấp |
| **NĐ 13/2023** | Nghị định 13/2023/NĐ-CP — Bảo vệ dữ liệu cá nhân |
| **Luật Dữ liệu 2024** | Luật số 60/2024/QH15 — hiệu lực 01/07/2025 |

---

## NEXT STEPS

1. **Duyệt ADR** (mục 3) — đặc biệt ADR-006 (Cloudflare R2 storage) và ADR-008 (PWA)
2. **Thu thập tài liệu nghiệp vụ** — file chấm công mẫu, chính sách hoa hồng, đơn giá B2B (mục 19)
3. **Kick-off meeting** — bàn giao team, chốt team size và timeline
4. **Setup infrastructure** — Vercel + Neon + Cloudflare R2 + CI/CD
5. **Database design** — chi tiết hóa Prisma schema từ mục 9, 10, 12.7
6. **Phase 1a Sprint 1** — M0 + M1

---

*Document version: 2.1*
*Ngày: 14/08/2026*
*Status: Draft*
