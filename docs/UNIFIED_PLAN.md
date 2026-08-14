# HRP SYSTEM - UNIFIED PROJECT PLAN
## Hệ thống Quản trị Nguồn Nhân lực & Cung ứng Nhân lực

> **Phiên bản:** 1.1
> **Ngày:** 14/08/2026
> **Trạng thái:** Draft - Chờ phê duyệt

> **Domain chính thức:**
> - https://hrpvietnam.com
> - https://hrpvietnam.vn

---

## MỤC LỤC
1. [Tổng quan Dự án](#1-tổng-quan-dự-án)
2. [Phân tích Người dùng & Personas](#2-phân-tích-người-dùng--personas)
3. [Kiến trúc Hệ thống](#3-kiến-trúc-hệ-thống)
4. [Danh sách Tính năng Chi tiết](#4-danh-sách-tính-năng-chi-tiết)
5. **[ĐỀ XUẤT CHIA MODULE - Phát triển từng phần](#5-đề-xuất-chia-module)**
   - [5.1 Phân tích Phạm vi Dự án](#51-phạm-vi-dự-án)
   - [5.2 Đề xuất 8 Module độc lập](#52-đề-xuất-8-module-độc-lập)
   - [5.3 Chiến lược Phát triển](#53-chiến-lược-phát-triển)
   - [5.4 Mockup Strategy cho Module chưa làm](#54-mockup-strategy-cho-module-chưa-làm)
6. [Phân chia Phase Triển khai](#6-phân-chia-phase-triển-khai)
7. [Thiết kế Cơ sở Dữ liệu - Worker Classification](#7-thiết-kế-cơ-sở-dữ-liệu---worker-classification)
   - [7.3.1 Talent Pool - Đang rảnh (DANG_RAIN)](#731-talent-pool---đang-rảnh-dang_rain)
   - [7.3.2 Data Isolation - Sale/NVKD chỉ thấy POOL của mình](#732-data-isolation---salenvkd-chỉ-thấy-pool-của-mình)
   - [7.4 Worker Assignment - UserID Primary/Secondary](#74-worker-assignment---hệ-thống-userid-primarysecondary)
8. [Kiến trúc Vendor Portal](#8-kiến-trúc-vendor-portal)
9. [Kiến trúc Chấm công Đa nền tảng](#9-kiến-trúc-chấm-công-đa-nền-tảng)
10. [Tech Stack & Infrastructure](#10-tech-stack--infrastructure)
    - [10B Architecture Blueprint - Vercel/Serverless](#10b-architecture-blueprint---vercelserveless)
11. [Rủi ro & Mitigation](#11-rủi-ro--mitigation)
    - [11.2.1 Encryption for Sensitive Data](#1121-encryption-for-sensitive-data)
    - [11.2.2 Date/Time Handling - Critical for Excel Import](#1122-datetime-handling---critical-for-excel-import)
12. [Timeline & Milestones](#12-timeline--milestones)
13. [Lộ trình Triển khai Hạ tầng](#13-lộ-trình-triển-khai-hạ-tầng-kỹ-thuật)

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

### 1.3. Định hướng Triển khai

```
┌─────────────────────────────────────────────────────────────────┐
│                    HRP SYSTEM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Web App   │     │  Admin B2B  │     │   Vendor    │       │
│  │  (Worker)   │     │  Dashboard  │     │   Portal    │       │
│  │ Mobile-first│     │  (React)    │     │  subdomain  │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                    │                    │              │
│         └────────────────────┼────────────────────┘              │
│                              │                                    │
│                    ┌─────────▼─────────┐                        │
│                    │  Next.js App Router │                        │
│                    │  (Serverless API)   │                        │
│                    └─────────┬─────────┘                        │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         │                    │                    │              │
│  ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐       │
│  │   Auth      │     │  Business   │     │    T&A      │       │
│  │   Service   │     │  Logic      │     │   Service   │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL Database                      │   │
│  │               (Neon Serverless + Prisma)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

> **⚠️ LƯU Ý KỸ THUẬT:** Backend dùng **Next.js App Router (Route Handlers)** chạy Serverless trên Vercel. KHÔNG dùng Fastify vì Fastify không tương thích Vercel Serverless (cold-start chậm, timeout). Next.js lo cả Frontend + Backend API.
```

### 1.4. Chiến lược Triển khai

```
Phase 1 (MVP)          Phase 2                 Phase 3
─────────────          ───────                 ───────
Web Responsive   →     Mobile App       →     Native Features
(4-6 tuần)           (Capacitor)            (Push, NFC, etc.)
                    (4-6 tuần)               (2-4 tuần)
```

---

## 2. PHÂN TÍCH NGƯỜI DÙNG & PERSONAS

### 2.1. Bảng tổng hợp Nhóm người dùng

| ID | Persona | Vai trò | Nhu cầu chính | Pain Points |
|----|---------|---------|---------------|-------------|
| **P1** | Người lao động phổ thông | Worker | Đăng ký nhanh, xem công, xem lương | Thao tác phức tạp, không quen công nghệ |
| **P2** | Cộng tác viên (CTV) | Referrer | Nhập thông tin được giới thiệu, xem hoa hồng | Không biết trạng thái ứng viên |
| **P3** | Vendor | Sub-contractor | Nhập thông tin NLĐ, xem dự án cần người | Muốn chủ động cung ứng |
| **P4** | Nhân sự nội bộ | HR/Sale | Quản lý Talent Pool, phân công dự án | Xử lý nhiều lead, cần tool nhanh |
| **P5** | Quản lý dự án | PM | Gán người, theo dõi tiến độ dự án | Quản lý nhiều vendor cùng lúc |
| **P6** | Kế toán | Accountant | Chốt công, tính lương, đối soát vendor | Tách lương phức tạp |
| **P7** | Admin | System Admin | RBAC, cấu hình hệ thống | Quản lý nhiều quyền |

### 2.2. Luồng Người dùng chi tiết

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG NGƯỜI DÙNG HỆ THỐNG HRP                        │
└─────────────────────────────────────────────────────────────────────────┘

[WORKER REGISTRATION FLOW]
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────┐
│   SĐT   │───▶│   OTP    │───▶│ Selfie    │───▶│ Profile │
│ Register│    │ Verify   │    │ Capture   │    │ Complete│
└─────────┘    └──────────┘    └───────────┘    └─────────┘
                                                            │
                    ┌─────────────────────────────────────────┘
                    │ Worker tự điền thông tin:
                    │ Họ tên, Ngày sinh, Địa chỉ, CCCD, Bank...


[PROJECT ASSIGNMENT FLOW]
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌─────────┐
│ Admin   │───▶│ Gán vào  │───▶│ Push xuống│───▶│ Tạo tài    │───▶│ Start   │
│ Assigns │    │ Project  │    │ Machine   │    │ khoản VN   │    │ Working │ 
└─────────┘    └──────────┘    └───────────┘    └────────────┘    └─────────┘

[VENDOR FLOW]
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐    ┌─────────┐
│ Vendor  │───▶│ View     │───▶│ Input     │───▶│ HRP        │───▶│ Worker  │
│ Login   │    │ Projects │    │ Workers   │    │ Reviews    │    │ Onboarded│ 
└─────────┘    └──────────┘    └───────────┘    └────────────┘    └─────────┘

[ATTENDANCE FLOWS]
┌──────────────────────┐    ┌──────────────────────┐
│   IN-SITE ATTENDANCE │    │  OUT-SITE ATTENDANCE │
│   (Máy vật lý)       │    │  (Selfie + GPS)      │
├──────────────────────┤    ├──────────────────────┤
│ Worker quẹt thẻ     │    │ Worker nhấn Check-in │
│ tại xưởng            │    │ Chụp selfie + GPS    │
│         ↓           │    │         ↓            │
│ Máy chấm công push   │    │ Server nhận ảnh     │
│ log về Backend       │    │ + GPS coordinates   │
│         ↓           │    │         ↓            │
│ Kế toán chốt BCC     │    │ Lưu vào History     │
│ (dùng cho tính lương)│    │ (quản lý ý thức)    │
└──────────────────────┘    └──────────────────────┘
```

---

## 3. KIẾN TRÚC HỆ THỐNG

### 3.1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                       │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   Web Worker    │    Web Admin    │   Vendor Portal │    Mobile App     │
│   (Mobile-first)│    Dashboard    │  (subdomain)    │   (Phase 2+)      │
│   * Selfie/GPS │    * React.js   │   * Separate   │   * Capacitor     │
│   * Job Board  │    * RBAC       │     subdomain   │   * Native APIs   │
│   * Payslip    │    * Charts     │   * Project View│                   │
└────────┬────────┴────────┬────────┴────────┬────────┴─────────┬────────┘
         │                  │                  │                  │
         └──────────────────┼──────────────────┼──────────────────┘
                            │                  │
                    ┌───────▼──────────────────▼───────┐
                    │     Next.js App Router            │
                    │    (Serverless Route Handlers)    │
                    │    * JWT Authentication          │
                    │    * Rate Limiting               │
                    │    * Request Validation           │
                    └───────┬─────────────┬─────────────┘
                            │             │
         ┌──────────────────┼─────────────┼──────────────────┐
         │                  │             │                  │
┌────────▼────────┐ ┌───────▼─────┐ ┌──────▼──────┐ ┌───────▼─────┐
│   Auth Service  │ │  HRM Service│ │  T&A Service│ │ Payroll Svc │
│   * OTP SMS    │ │  * Talent   │ │  * Machine  │ │  * Salary   │
│   * JWT       │ │  * Project  │ │  * Selfie   │ │  * Vendor   │
│   * RBAC      │ │  * Vendor   │ │  * GPS      │ │  * Invoice  │
└────────┬────────┘ └──────┬──────┘ └──────┬──────┘ └───────┬─────┘
         │                │               │                │
         └────────────────┴───────────────┴────────────────┘
                            │
                    ┌───────▼───────────────┐
                    │   POSTGRESQL          │
                    │   * JSONB Support     │
                    │   * Full-text search  │
                    │   * Geospatial (GPS)  │
                    └───────────────────────┘
```

### 3.2. Domain Structure

```
src/
├── domains/
│   ├── auth/           # Authentication & Authorization
│   ├── worker/         # Worker Management (Talent Pool)
│   ├── project/        # Project & Assignment
│   ├── attendance/     # Time & Attendance
│   ├── payroll/        # Salary & Billing
│   ├── vendor/         # Vendor Management
│   ├── crm/            # Client Management
│   └── commission/     # CTV Commission
├── shared/
│   ├── types/          # Shared TypeScript types
│   ├── utils/          # Utilities
│   ├── constants/      # Constants
│   └── errors/         # Error classes
└── infrastructure/
    ├── database/       # Prisma/Drizzle ORM
    ├── cache/          # Redis
    ├── queue/          # Bull Queue
    └── external/       # External APIs (Zalo, SMS, etc.)
```

---

## 4. DANH SÁCH TÍNH NĂNG CHI TIẾT

### 4.1. Module A: Cổng thông tin & App Người lao động (Worker Portal)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **A-01** | Đăng nhập OTP | SĐT + OTP 6 số qua SMS | P0 | 1 |
| **A-01b** | **Đăng nhập Zalo** | Đăng nhập 1 chạm (quan trọng cho lao động phổ thông) | P0 | 1 |
| **A-02** | Hoàn thiện Profile | Worker tự điền: Họ tên, CCCD, Bank, Địa chỉ... | P0 | 1 |
| **A-03** | Đăng ký nhanh | Tạo UserID ngay khi đăng ký (chỉ cần SĐT) | P0 | 1 |
| **A-04** | Bảng tin việc làm | Job Card với filter | P0 | 1 |
| **A-05** | Ứng tuyển 1 chạm | Gửi SĐT + thông tin cơ bản | P0 | 1 |
| **A-06** | Xem thông tin dự án | Tên, địa điểm, quản lý | P0 | 1 |
| **A-07** | Chấm công in-site | Dùng máy vật lý (xưởng) | P1 | 2 |
| **A-08** | Check-in ngoài site | **Selfie + GPS** (quản lý ý thức) | **P0** | **1** |
| **A-09** | Xem lịch sử chấm công | Từ máy vật lý + Check-in GPS | P0 | 1 |
| **A-10** | Xem phiếu lương | Chi tiết theo kỳ | P0 | 2 |
| **A-11** | Đề nghị tạm ứng | Gửi request (chỉ HRP direct) | P0 | 2 |
| **A-12** | Phản ánh/Khiếu nại | Báo sai công, sai lương | P0 | 2 |
| **A-13** | Cập nhật thông tin | Bank, CCCD, SĐT | P0 | 1 |

### 4.2. Module B: Cộng tác viên & Giới thiệu (CTV Portal)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **B-01** | Đăng ký CTV | Họ tên, CCCD, STK | P0 | 1 |
| **B-02** | Nhập người được giới thiệu | SĐT, Họ Tên, Dự án | P0 | 1 |
| **B-03** | Dashboard theo dõi | Trạng thái + hoa hồng | P0 | 1 |
| **B-04** | Lịch sử hoa hồng | Chi tiết từng khoản | P1 | 2 |
| **B-05** | Thông báo | Zalo/SMS khi có cập nhật | P1 | 2 |

### 4.3. Module C: Vendor Portal (subdomain)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **C-01** | Đăng nhập Vendor | Tài khoản riêng subdomain | P0 | 1 |
| **C-02** | Xem danh sách dự án | Dự án đang cần người | P0 | 1 |
| **C-03** | Nhập thông tin NLĐ | Form nhập thông tin ứng viên | P0 | 1 |
| **C-04** | Xem trạng thái | NLĐ đã được duyệt/chưa | P0 | 1 |
| **C-05** | Xem đối soát | Tổng ngày công NLĐ vendor | P1 | 2 |
| **C-06** | Xuất báo cáo | Biên bản đối soát B2B | P1 | 2 |

### 4.4. Module D: Quản trị B2B CRM & Dự án

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **D-01** | CRUD Khách hàng | Hồ sơ doanh nghiệp | P0 | 1 |
| **D-02** | CRUD Dự án | Tạo, gán PM, Kanban | P0 | 1 |
| **D-03** | Quản lý Pipeline | Kanban: Tiếp cận→Ký HĐ→Thực thi | P0 | 1 |
| **D-04** | CRUD Máy chấm công | Serial, IP, Map vào Dự án | P1 | 2 |
| **D-05** | Gán nhân sự | Điều động vào dự án | P0 | 1 |
| **D-06** | Import từ Vendor | Nhận danh sách từ vendor | P0 | 1 |

### 4.5. Module E: Talent Pool & ATS

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **E-01** | Hồ sơ NLĐ | Master data đầy đủ | P0 | 1 |
| **E-02** | Vòng đời trạng thái | Lead→Active→Inactive→Blacklist | P0 | 1 |
| **E-03** | Phân loại nguồn gốc | HRP_Direct / Vendor_Supplied / CTV_Referral | P0 | **1** |
| **E-04** | Bộ lọc nâng cao | Tuổi, khu vực, kỹ năng | P0 | 1 |
| **E-05** | Xuất Excel | Export data | P1 | 2 |
| **E-06** | Lịch sử tương tác | Ghi chú, log cuộc gọi | P1 | 2 |

### 4.6. Module F: Vận hành & T&A

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **F-01** | Webhook T&A | Nhận log từ máy vật lý | P0 | 2 |
| **F-02** | Giao diện BCC | Xử lý công thủ công | P0 | 2 |
| **F-03** | Tách BCC | HRP vs Vendor | P0 | 2 |
| **F-04** | Xử lý ticket | Phản ánh, tạm ứng | P0 | 2 |
| **F-05** | Check-in GPS log | Lưu selfie + GPS ngoài site | P0 | **1** |
| **F-06** | SOP ngoại lệ | Mất điện, máy hỏng | P1 | 2 |

### 4.7. Module G: Lương & Thanh toán

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **G-01** | Tính lương HRP | Tự động tính lương NLĐ direct | P0 | 2 |
| **G-02** | Đối soát Vendor | Tổng hợp công → Báo cáo B2B | P0 | 2 |
| **G-03** | Tính hoa hồng CTV | Tự động tính commission | P1 | 2 |
| **G-04** | Xuất file lương | Excel payroll | P0 | 2 |
| **G-05** | Quản lý công nợ | Theo dõi thanh toán | P1 | 2 |

### 4.8. Module H: Nhân sự Nội bộ (HRM)

| ID | Tính năng | Mô tả | Ưu tiên | Phase |
|----|-----------|-------|---------|-------|
| **H-01** | CRUD nhân viên | Mã NV, thông tin nội bộ | P0 | 1 |
| **H-02** | Sơ đồ tổ chức | Cây phòng ban, cấp báo cáo | P1 | 2 |
| **H-03** | RBAC | Roles + Permissions | P0 | 1 |
| **H-04** | Data-level security | PM chỉ thấy data của mình | P0 | 1 |

---

## 5. ĐỀ XUẤT CHIA MODULE - Phát triển từng phần

### 5.1. Phạm vi Dự án

Dự án HRP quá lớn (~440 man-days) cần chia thành các **module độc lập** có thể phát triển song song:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHẠM VI DỰ ÁN HRP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   QUẢN LÝ ĐỐI TÁC/DỰ ÁN          │   QUẢN LÝ LAO ĐỘNG                   │
│   ─────────────────────────        │   ────────────────────                │
│   • CRM Khách hàng                 │   • Worker Portal (B2C)               │
│   • Quản lý Dự án                 │   • CTV Portal                         │
│   • Vendor Portal                  │   • Talent Pool & ATS                  │
│   • Đối soát B2B                   │   • Worker Classification              │
│                                    │   • GPS Check-in                       │
│                                    │                                        │
│   ─────────────────────────        │   ────────────────────                │
│   LOẠI LAO ĐỘNG (Worker Type):    │   KẾ TOÁN & NHÂN SỰ                   │
│   • Phổ thông (vận hành)          │   ────────────────────                │
│   • Văn phòng (internal)           │   • Chấm công (T&A)                   │
│   • Công xưởng (xưởng)             │   • Tính lương                        │
│   • Thuê ngoài (vendor)            │   • Đối soát vendor                   │
│                                    │   • KPI Calculation                    │
│   TRẠNG THÁI TRONG POOL:          │   • HRM (nhân sự nội bộ)              │
│   • Đang rảnh (chưa có việc)      │                                        │
│   • Đang làm (đã gán dự án)      │                                        │
│   • Đã xong (hoàn thành dự án)   │                                        │
│                                    │                                        │
│   ★ Sale/NVKD chỉ thấy POOL       │   ────────────────────                │
│      CỦA MÌNH (data isolation)    │   THIẾT BỊ/TRANG BỊ                   │
│                                    │   (Phase sau)                         │
│                                    │                                        │
│   ─────────────────────────        │   ────────────────────                │
│   MỞ RỘNG TRONG TƯƠNG LAI:       │   THIẾT BỊ/TRANG BỊ                   │
│   • Quản lý thiết bị cấp phát     │   (Phase sau)                         │
│   • Checklist trang bị NV         │                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2. Đề xuất 8 Module độc lập

> **Nguyên tắc:** Mỗi module có thể hoạt động độc lập, có database riêng hoặc schema riêng trong cùng DB, và có thể tạo UI mockup trước khi code thật.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      8 MODULES - ĐỘC LẬP & CÓ THỂ CHẠY SONG SONG            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐│
│  │  MODULE 1          │  │  MODULE 2           │  │  MODULE 3           ││
│  │  CORE AUTH        │  │  WORKER PORTAL      │  │  VENDOR PORTAL      ││
│  │  (P0)             │  │  (B2C - P0)        │  │  (B2B Partner)      ││
│  │  ─────────────── │  │  ──────────────── │  │  ──────────────── ││
│  │  • OTP SMS        │  │  • Registration    │  │  • Subdomain       ││
│  │  • JWT Auth       │  │  • Profile Mgmt    │  │  • Worker Input     ││
│  │  • RBAC           │  │  • Job Board       │  │  • Project View     ││
│  │  • Session        │  │  • Quick Apply      │  │  • Status Track     ││
│  │                   │  │  • GPS Check-in    │  │  • Billing View     ││
│  │  Effort: 30 MD    │  │  • Payslip View    │  │                     ││
│  │  Phase: 1         │  │                     │  │  Effort: 20 MD      ││
│  │                   │  │  Effort: 50 MD     │  │  Phase: 1-2         ││
│  │  Status: CORE     │  │  Phase: 1          │  │                     ││
│  └─────────────────────┘  │  Status: CORE     │  │  Status: CORE       ││
│                           └─────────────────────┘  └─────────────────────┘│
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐│
│  │  MODULE 4          │  │  MODULE 5           │  │  MODULE 6           ││
│  │  CRM & PROJECTS   │  │  ATTENDANCE (T&A)  │  │  PAYROLL           ││
│  │  (B2B Core)       │  │  (Chấm công)       │  │  (Tính lương)      ││
│  │  ─────────────── │  │  ──────────────── │  │  ──────────────── ││
│  │  • Client CRUD    │  │  • Import Excel    │  │  • Salary Calc     ││
│  │  • Project CRUD   │  │  • GPS Check-in    │  │  • Payslip Gen     ││
│  │  • Kanban Board   │  │  • Machine Sync    │  │  • Vendor Billing   ││
│  │  • PM Assignment  │  │  • Ticket Handle   │  │  • KPI Calc        ││
│  │  • Contract Mgmt  │  │                     │  │                     ││
│  │                   │  │  Effort: 50 MD     │  │  Effort: 60 MD      ││
│  │  Effort: 40 MD    │  │  Phase: 1-2        │  │  Phase: 2          ││
│  │  Phase: 1         │  │                     │  │                     ││
│  │  Status: CORE     │  │  Status: CORE       │  │  Status: CORE       ││
│  └─────────────────────┘  │  (GPS đã có ở M2) │  └─────────────────────┘│
│                           └─────────────────────┘                        │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐                          │
│  │  MODULE 7          │  │  MODULE 8           │                          │
│  │  HRM (Nhân sự)    │  │  ASSETS & EQUIPMENT │                          │
│  │  (Internal Staff) │  │  (Trang bị - Phase sau)│                          │
│  │  ─────────────── │  │  ──────────────── │                          │
│  │  • Employee CRUD  │  │  • Asset Registry  │                          │
│  │  • Org Chart      │  │  • Assign to Staff │                          │
│  │  • Leave Mgmt     │  │  • Checklist       │          MOCKUP ONLY    │
│  │  • Performance    │  │  • Return Process  │          (Chưa code)    │
│  │                   │  │                     │                          │
│  │  Effort: 40 MD    │  │  Effort: 30 MD      │                          │
│  │  Phase: 2-3       │  │  Phase: 3+          │                          │
│  │                   │  │                     │                          │
│  │  Status: PHASE 2  │  │  Status: MOCKUP     │                          │
│  └─────────────────────┘  └─────────────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.3. Chiến lược Phát triển

#### 5.3.1. Thứ tự ưu tiên Module

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      THỨ TỰ PHÁT TRIỂN                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SPRINT 1-2: CORE FOUNDATION                                               │
│  ═══════════════════════════                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 1: CORE AUTH                    [MUST HAVE - Base cho tất cả]  │ │
│  │  ├── OTP SMS Integration                                           │ │
│  │  ├── JWT + RBAC                                                     │ │
│  │  └── Session Management                                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SPRINT 3-6: WORKER & VENDOR                                               │
│  ═════════════════════════════════                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 2: WORKER PORTAL                  [DEMO MVP]                  │ │
│  │  ├── Registration (SĐT + OTP)                                      │ │
│  │  ├── Profile Completion                                             │ │
│  │  ├── GPS Check-in                                                   │ │
│  │  └── Job Board + Quick Apply                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 3: VENDOR PORTAL                   [DEMO MVP]                │ │
│  │  ├── Subdomain Setup                                                │ │
│  │  ├── Worker Input Form                                              │ │
│  │  └── Project View + Status                                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SPRINT 7-10: CRM & ATTENDANCE                                             │
│  ═════════════════════════════════                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 4: CRM & PROJECTS                  [DEMO MVP]                │ │
│  │  ├── Client/Project CRUD                                           │ │
│  │  ├── Kanban Pipeline                                                │ │
│  │  └── PM Assignment                                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 5: ATTENDANCE (T&A)                                         │ │
│  │  ├── Excel Import from Partners                                      │ │
│  │  ├── GPS Check-in Log (reuse from M2)                               │ │
│  │  ├── Ticket System (phản ánh)                                       │ │
│  │  └── Machine Webhook Integration                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  SPRINT 11-14: PAYROLL & HRM                                               │
│  ═════════════════════════════════                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 6: PAYROLL                                                   │ │
│  │  ├── Salary Calculation                                              │ │
│  │  ├── Vendor Billing (B2B)                                            │ │
│  │  ├── KPI Calculation                                                  │ │
│  │  └── Payslip Generation                                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 7: HRM (Nhân sự nội bộ)           [MOCKUP FIRST]             │ │
│  │  ├── Employee CRUD                                                  │ │
│  │  ├── Organization Chart                                             │ │
│  │  └── Leave Management                                               │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  PHASE SAU: MOCKUP ONLY                                                    │
│  ═══════════════════════════                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  MODULE 8: ASSETS & EQUIPMENT              [UI MOCKUP ONLY]          │ │
│  │  ├── Asset Registry UI                                              │ │
│  │  ├── Assignment to Staff UI                                        │ │
│  │  └── Checklist Flow Mockup                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 5.3.2. Chiến lược Mockup cho Module chưa làm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MOCKUP STRATEGY - "NHÌN TRƯỚC"                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MỤC ĐÍCH MOCKUP:                                                          │
│  ───────────────                                                           │
│  • Người dùng thấy TỔNG THỂ hệ thống trước khi code xong                 │
│  • Phát hiện requirement sai/sót SỚM (trước khi code)                     │
│  • Stakeholder approval dễ dàng hơn                                        │
│  • Team hiểu scope đầy đủ                                                 │
│                                                                             │
│  CÁCH LÀM:                                                                 │
│  ───────────                                                                │
│  1. Tạo Figma/HTML mockup cho ALL modules                                  │
│  2. Link các mockup lại với nhau (prototype flow)                        │
│  3. Demo toàn bộ system bằng mockup                                        │
│  4. Sau khi core modules done → code từng module còn lại                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MOCKUP PRIORITY                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  MODULE 1-6 (Core): Đã code thật, không cần mockup nhiều         │   │
│  │  MODULE 7 (HRM): Mockup trước, code sau Phase 2                   │   │
│  │  MODULE 8 (Assets): Mockup only, để stakeholder hình dung         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.4. Module Summary Table

| Module | Tên | Effort | Phase | Priority | Status |
|--------|-----|--------|-------|----------|--------|
| **M1** | Core Auth | 30 MD | 1 | P0 | **CODE** |
| **M2** | Worker Portal | 50 MD | 1 | P0 | **CODE** |
| **M3** | Vendor Portal | 20 MD | 1-2 | P0 | **CODE** |
| **M4** | CRM & Projects | 40 MD | 1 | P0 | **CODE** |
| **M5** | Attendance (T&A) | 50 MD | 1-2 | P0 | **CODE** |
| **M6** | Payroll | 60 MD | 2 | P0 | **CODE** |
| **M7** | HRM (Nhân sự) | 40 MD | 2-3 | P1 | **MOCKUP FIRST** |
| **M8** | Assets & Equipment | 30 MD | 3+ | P2 | **MOCKUP ONLY** |

**Tổng: 320 MD (Core) + 70 MD (Future) = ~390 MD**

---

### 5.5. UI Mockup Requirements cho từng Module

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MOCKUP REQUIREMENTS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODULE 1: CORE AUTH                                                        │
│  ───────────────────                                                        │
│  • Login page (SĐT + OTP)                                                 │
│  • OTP verification modal                                                  │
│  • Role selection screen                                                   │
│  • Forgot password flow                                                    │
│                                                                             │
│  MODULE 2: WORKER PORTAL                                                   │
│  ──────────────────────────                                                │
│  • Registration flow (4 bước)                                             │
│  • Home dashboard                                                          │
│  • Job board + filters                                                     │
│  • Job detail + apply                                                     │
│  • Profile edit page                                                       │
│  • GPS Check-in screen                                                     │
│  • Attendance history                                                      │
│  • Payslip viewer                                                          │
│                                                                             │
│  MODULE 3: VENDOR PORTAL                                                   │
│  ──────────────────────────                                                │
│  • Login (subdomain)                                                       │
│  • Dashboard (worker count, project count)                                │
│  • Project list                                                            │
│  • Worker input form                                                       │
│  • Worker status list                                                      │
│  • Billing summary                                                         │
│                                                                             │
│  MODULE 4: CRM & PROJECTS                                                 │
│  ───────────────────────────                                               │
│  • Client list + detail                                                    │
│  • Project list + Kanban                                                   │
│  • Project detail + assignment                                             │
│  • Contract management                                                     │
│                                                                             │
│  MODULE 5: ATTENDANCE (T&A)                                               │
│  ─────────────────────────────                                             │
│  • Import Excel interface                                                  │
│  • Attendance overview table                                               │
│  • GPS logs dashboard                                                      │
│  • Ticket management                                                       │
│  • Exception handling                                                      │
│                                                                             │
│  MODULE 6: PAYROLL                                                         │
│  ──────────────────                                                        │
│  • Salary calculation interface                                            │
│  • Payroll summary table                                                  │
│  • Payslip template                                                        │
│  • Vendor billing report                                                   │
│  • KPI dashboard                                                           │
│                                                                             │
│  MODULE 7: HRM (MOCKUP FIRST) ★                                           │
│  ─────────────────────────────                                             │
│  • Employee directory                                                      │
│  • Employee detail                                                         │
│  • Organization chart                                                      │
│  • Leave request flow                                                      │
│  • Performance review                                                      │
│  ★ Priority: Tạo mockup TRƯỚC Phase 2 để stakeholder review              │
│                                                                             │
│  MODULE 8: ASSETS (MOCKUP ONLY) ★★                                        │
│  ───────────────────────────────                                           │
│  • Asset registry list                                                     │
│  • Asset detail                                                            │
│  • Assign to employee                                                      │
│  • Checklist form                                                          │
│  • Return process                                                          │
│  ★★ Priority: LOW - Tạo mockup để hình dung Phase 3                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. PHÂN CHIA PHASE TRIỂN KHAI

### 6.1. Tổng quan các Phase

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE DELIVERY TIMELINE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: CORE PLATFORM MVP (4-6 tuần)                           │    │
│  │ ─────────────────────────────────────                            │    │
│  │ Mục tiêu: Có prototype hoạt động với core features              │    │
│  │                                                              │    │
│  │ ✓ Auth: OTP, Registration, RBAC                             │    │
│  │ ✓ Worker Portal: Job Board, Quick Apply, Profile              │    │
│  │ ✓ CTV Portal: Refer worker, Track status                     │    │
│  │ ✓ Vendor Portal: View projects, Input workers                │    │
│  │ ✓ Talent Pool: Worker profiles, Status lifecycle             │    │
│  │ ✓ CRM: Clients, Projects, Kanban                             │    │
│  │ ✓ **Check-in GPS: Selfie + GPS ngoài site**                  │    │
│  │ ✓ **Worker Classification: 3 loại + status**                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: OPERATIONS & T&A (4-6 tuần)                           │    │
│  │ ─────────────────────────────────────                            │    │
│  │ Mục tiêu: Hoàn thiện vận hành, tích hợp máy chấm công           │    │
│  │                                                              │    │
│  │ ✓ T&A Integration: ADMS protocol, Máy vật lý                │    │
│  │ ✓ BCC Processing: Giao diện chốt công                      │    │
│  │ ✓ Payroll: Tính lương HRP, đối soát Vendor                 │    │
│  │ ✓ Payslip: Xem phiếu lương                                │    │
│  │ ✓ Tickets: Phản ánh, tạm ứng                               │    │
│  │ ✓ Commission: Tính hoa hồng CTV                           │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: MOBILE APP (4-6 tuần)                                 │    │
│  │ ─────────────────────────────────────                            │    │
│  │ Mục tiêu: Đóng gói web thành app native                         │    │
│  │                                                              │    │
│  │ ✓ Capacitor Android/iOS packaging                           │    │
│  │ ✓ Push Notifications (FCM)                                 │    │
│  │ ✓ NFC CCCD scanning                                        │    │
│  │ ✓ Offline support                                          │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Chi tiết từng Phase

#### **PHASE 1: CORE PLATFORM MVP**

| Thành phần | Deliverables | Definition of Done |
|------------|--------------|-------------------|
| **Auth System** | Login OTP, JWT, RBAC core | User đăng nhập được, phân quyền hoạt động |
| **Worker Portal** | Registration, Job Board, Profile, Check-in GPS | Worker đăng ký và check-in selfie+GPS |
| **CTV Portal** | Đăng ký CTV, nhập referral, dashboard | CTV nhập được người và xem trạng thái |
| **Vendor Portal** | subdomain vendor.hrpvietnam.com, xem dự án, nhập NLĐ | Vendor đăng nhập và nhập được NLĐ |
| **Talent Pool** | Worker CRUD, classification, status lifecycle | HR xem và quản lý được hồ sơ |
| **CRM Core** | Client CRUD, Project CRUD, Kanban | Admin tạo được dự án, gán PM |
| **Worker Classification** | 3 loại worker + status | Phân biệt được: vận hành, thuê ngoài, CTV |

**Phase 1 Exit Criteria:**
- [ ] Worker đăng ký và nhận UserID
- [ ] GPS check-in hoạt động (ý thức NLĐ)
- [ ] Vendor có thể nhập NLĐ qua subdomain
- [ ] HR xem và phân loại được worker
- [ ] Demo được full flow từ đăng ký → được phân vào dự án

---

#### **PHASE 2: OPERATIONS & T&A**

| Thành phần | Deliverables | Definition of Done |
|------------|--------------|-------------------|
| **Attendance Import** | Upload file Excel, Map mã NV | Kế toán import được file chấm công |
| **Payroll Calculation** | Tính lương tự động | Xuất được bảng lương Excel |
| **KPI Calculation** | Map giờ công → KPI Sale | Tính được KPI theo giờ công |
| **Vendor Billing** | Đối soát B2B | Xuất được biên bản đối soát cho vendor |
| **Payslip** | Worker xem phiếu lương | Worker thấy được lương chi tiết |
| **Tickets** | Phản ánh, tạm ứng | Luồng xử lý ticket hoàn chỉnh |

**Phase 2 Exit Criteria:**
- [ ] Kế toán import được file chấm công từ đối tác
- [ ] Hệ thống tính được lương và KPI
- [ ] Xuất được file lương và đối soát vendor
- [ ] Worker xem được phiếu lương

---

#### **PHASE 3: MOBILE APP**

| Thành phần | Deliverables | Definition of Done |
|------------|--------------|-------------------|
| **Capacitor Build** | Android APK, iOS IPA | App có mặt trên 2 store |
| **Push Notifications** | FCM integration | Thông báo Zalo/SMS |
| **Offline Mode** | Local storage, sync | Dùng được khi không có mạng |

**Ghi chú:** Đăng ký chỉ cần SĐT + OTP. Worker tự điền Profile (Họ tên, CCCD, Bank...) sau.

---

## 6. WORK BREAKDOWN STRUCTURE (WBS)

### 6.1. Epic Mapping

| Epic | Tên | Phase | Effort (MD) |
|------|-----|-------|-------------|
| **E1** | Core Framework & Infrastructure | 1 | 40 |
| **E2** | Auth & RBAC System | 1 | 30 |
| **E3** | Worker Portal (B2C) | 1 | 50 |
| **E4** | CTV Portal | 1 | 20 |
| **E5** | Vendor Portal (subdomain) | 1 | 30 |
| **E6** | Talent Pool & ATS | 1 | 40 |
| **E7** | CRM & Project Management | 1 | 40 |
| **E8** | Attendance Import & Payroll | 2 | 50 |
| **E9** | KPI Calculation | 2 | 30 |
| **E10** | Vendor Billing | 2 | 30 |
| **E11** | Commission System | 2 | 20 |
| **E12** | Mobile App Packaging | 3 | 30 |
| **E13** | Native Features (Push, Offline) | 3 | 20 |

**Tổng ước tính: ~440 man-days**

### 6.2. WBS chi tiết Phase 1

```
E1: CORE FRAMEWORK & INFRASTRUCTURE
├── 1.1 Project Setup (Next.js 14 App Router, Prisma, Vercel)
├── 1.2 Database Schema Design
├── 1.3 CI/CD Pipeline (GitHub Actions + Vercel)
├── 1.4 API Documentation (OpenAPI/Swagger)
└── 1.5 Logging & Monitoring

E2: AUTH & RBAC SYSTEM
├── 2.1 OTP SMS Integration (Viettel/VNPT API)
├── 2.2 Zalo Login API (đăng nhập 1 chạm cho lao động phổ thông)
├── 2.3 JWT Authentication
├── 2.4 Role & Permission Management
├── 2.5 Session Management
└── 2.6 Data-level Security

E3: WORKER PORTAL (B2C)
├── 3.1 Registration Flow
├── 3.2 Job Board UI
├── 3.3 Quick Apply Flow
├── 3.4 Profile Management
├── 3.5 Project Info View
├── 3.6 Attendance History
└── 3.7 Navigation & Layout

E4: CTV PORTAL
├── 4.1 CTV Registration
├── 4.2 Referral Input Form
├── 4.3 Dashboard (status + commission)
└── 4.4 Notification

E5: VENDOR PORTAL (subdomain)
├── 5.1 Subdomain Setup (vendor.hrpvietnam.com)
├── 5.2 Vendor Auth
├── 5.3 Project Listing (open positions)
├── 5.4 Worker Input Form
├── 5.5 Status Tracking
└── 5.6 Admin Review Workflow

E6: TALENT POOL & ATS
├── 6.1 Worker Master Data
├── 6.2 Status Lifecycle
├── 6.3 **Worker Classification** (Direct/Vendor/CTV)
├── 6.4 Advanced Filters
├── 6.5 Search & Export
└── 6.6 Activity Logs

E7: CRM & PROJECT MANAGEMENT
├── 7.1 Client CRUD
├── 7.2 Project CRUD
├── 7.3 Kanban Board
├── 7.4 PM Assignment
└── 7.5 Staff Assignment

E8: CHECK-IN GPS (Selfie + Location)
├── 8.1 Camera Integration (front-facing)
├── 8.2 GPS Location Capture
├── 8.3 Image Upload + Metadata
├── 8.4 GPS Data Storage
├── 8.5 History View
└── 8.6 Admin Dashboard (location logs)
```

---

## 7. THIẾT KẾ CƠ SỞ DỮ LIỆU - WORKER CLASSIFICATION

### 7.1. Worker Entity với Classification

Đây là điểm quan trọng cần làm rõ logic:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WORKER CLASSIFICATION MODEL                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐                                                     │
│  │    WORKER       │                                                     │
│  ├─────────────────┤                                                     │
│  │ id              │                                                     │
│  │ userId          │ ◄── Unique, tạo ngay khi đăng ký                   │
│  │ fullName        │                                                     │
│  │ phone           │                                                     │
│  │ cccdNumber      │ ⚠️ ENCRYPTED (mã hóa at rest)                           │
│  │ cccdImage       │                                                     │
│  │ selfieImage     │                                                     │
│  │ dateOfBirth     │                                                     │
│  │ gender          │                                                     │
│  │ bankAccount     │ ⚠️ ENCRYPTED (mã hóa at rest)                           │
│  │ bankName        │                                                     │
│  │                 │                                                     │
│  │ sourceType      │ ◄── ENUM: HRP_DIRECT | VENDOR_SUPPLIED | CTV_REFERRAL │
│  │ sourceVendorId  │ ◄── FK nếu là VENDOR_SUPPLIED                       │
│  │ sourceCtvId     │ ◄── FK nếu là CTV_REFERRAL                          │
│  │                 │                                                     │
│  │ workerCategory  │ ◄── ENUM:                                           │
│  │                 │       • VANHANH_PHOTHONG (Operations - phổ thông)   │
│  │                 │       • VANHANH_VANPHONG (Operations - văn phòng)   │
│  │                 │       • VANHANH_CONGXUONG (Operations - công xưởng)│
│  │                 │       • THUENGOAI (Outsourced - cho thuê ngoài)    │
│  │                 │       • GIOITHIEU_HH (Referred - hưởng HH)        │
│  │                 │                                                     │
│  │ workStatus      │ ◄── ENUM: CHODUYET | DANG_LAM | DANG_RAIN |   │
│  │                 │               TAMNGHI | NGHIVIEC | BLACKLIST        │
│  │ createdAt       │                                                     │
│  │ updatedAt       │                                                     │
│  └─────────────────┘                                                     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ WORKER STATUS LIFECYCLE                                             │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                      │  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │  │
│   │ CHỜ DUYỆT│───▶│ ĐANG RẢNH│───▶│ ĐANG LÀM │◀───│ TẠM NGHỈ │   │  │
│   │ (Pending)│    │ (Pool)   │    │(Working) │    │(On Leave)│   │  │
│   └──────────┘    └────┬─────┘    └────┬─────┘    └──────────┘   │  │
│                        │                │                            │  │
│                        │                ▼                            │  │
│                        │         ┌──────────┐                       │  │
│                        │         │ NGHỈ VIỆC│                       │  │
│                        │         │(Resigned)│                       │  │
│                        │         └──────────┘                       │  │
│                        │                                         │  │
│                        ▼                                         │  │
│                 ┌──────────┐                                    │  │
│                 │BLACKLIST │◀─── (vi phạm / bỏ việc ngang)     │  │
│                 │(Blocked) │                                    │  │
│                 └──────────┘                                    │  │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ GIẢI THÍCH TRẠNG THÁI "ĐANG RẢNH" (TALENT POOL)                    │ │
│  │                                                                      │ │
│  │ • Worker đã đăng ký hoặc được Sale/NVKD nhập vào hệ thống         │ │
│  │ • Chưa được gán vào dự án nào HOẶC đã xong dự án cũ             │ │
│  │ • Có thể được SALE/NVKD gán vào dự án mới khi cần                │ │
│  │ • Sale/NVKD chỉ thấy POOL CỦA MÌNH (data isolation theo owner)  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2. Worker Classification Logic

```typescript
// WORKER CATEGORIES & BUSINESS RULES

enum WorkerSourceType {
  HRP_DIRECT      = 'HRP_DIRECT',      // Trực tiếp ký HĐ với HRP
  VENDOR_SUPPLIED = 'VENDOR_SUPPLIED', // Cung cấp bởi Vendor
  CTV_REFERRAL    = 'CTV_REFERRAL'     // Được giới thiệu bởi CTV
}

enum WorkerCategory {
  // === NHÂN VIÊN VẬN HÀNH (Operations) ===
  VANHANH_PHOTHONG = 'VANHANH_PHOTHONG',  // Lao động phổ thông (tính giờ, KPI cho người quản lý)
  VANHANH_VANPHONG = 'VANHANH_VANPHONG',  // Nhân viên văn phòng (chấm KPI theo công việc)
  VANHANH_CONGXUONG = 'VANHANH_CONGXUONG', // Công nhân xưởng (không cần KPI)
  
  // === CHO THUÊ NGOÀI ===
  THUENGOAI = 'THUENGOAI', // Thuê ngoài cho công ty khác
  
  // === GIỚI THIỆU HƯỞNG HOA HỒNG ===
  GIOITHIEU_HH = 'GIOITHIEU_HH' // Giới thiệu cho cty khác, hưởng HH
}

enum WorkStatus {
  CHODUYET    = 'CHODUYET',    // Chờ duyệt hồ sơ
  DANG_LAM    = 'DANG_LAM',    // Đang làm việc (đã được gán dự án)
  DANG_RAIN   = 'DANG_RAIN',   // Đang rảnh - TRONG POOL (chưa được gán hoặc đã xong dự án)
  TAMNGHI     = 'TAMNGHI',     // Tạm nghỉ
  NGHIVIEC    = 'NGHIVIEC',    // Nghỉ việc (đã resign)
  BLACKLIST   = 'BLACKLIST'    // Blacklist (vi phạm)
}

// ============================================================
// BUSINESS RULES THEO CLASSIFICATION
// ============================================================

const WORKER_RULES = {
  VANHANH_PHOTHONG: {
    salarySource: 'HRP',           // HRP trả lương
    attendance: ['MACHINE', 'GPS'], // Dùng cả máy vật lý + GPS
    payslipVisible: true,           // Xem được phiếu lương
    advanceRequest: true,           // Được đề nghị tạm ứng
    vendorBilling: false,           // Không cần đối soát vendor
    canBeReferred: true,            // Có thể được giới thiệu đi
    kpiRequired: true,              // Cần chấm KPI (tính giờ làm)
    kpiType: 'HOURS_BASED',        // KPI dựa trên số giờ làm việc
    // Số giờ làm việc sẽ được map vào KPI của người quản lý/CTV giới thiệu
  },
  
  VANHANH_VANPHONG: {
    salarySource: 'HRP',
    attendance: ['MACHINE', 'GPS'],
    payslipVisible: true,
    advanceRequest: true,
    vendorBilling: false,
    canBeReferred: true,
    kpiRequired: true,              // Cần chấm KPI (theo công việc/phòng ban)
    kpiType: 'TASK_BASED',         // KPI dựa trên công việc được giao
  },
  
  VANHANH_CONGXUONG: {
    salarySource: 'HRP',
    attendance: ['MACHINE'],       // Ưu tiên máy vật lý
    payslipVisible: true,
    advanceRequest: true,
    vendorBilling: false,
    canBeReferred: true,
    kpiRequired: false,            // Không cần chấm KPI
    kpiType: null,
  },
  
  THUENGOAI: {
    salarySource: 'EXTERNAL',      // Công ty khác trả lương
    attendance: ['GPS'],            // Chỉ dùng GPS check-in (ý thức)
    payslipVisible: false,          // HRP không trả lương
    advanceRequest: false,         // Không có tạm ứng từ HRP
    vendorBilling: false,          // HRP không đối soát
    canBeReferred: false,         // Không phải để giới thiệu
    kpiRequired: false,
    kpiType: null,
  },
  
  GIOITHIEU_HH: {
    salarySource: 'EXTERNAL',      // Công ty được giới thiệu trả
    attendance: ['GPS'],           // GPS check-in
    payslipVisible: false,
    advanceRequest: false,
    vendorBilling: false,
    canBeReferred: false,          // Không giới thiệu tiếp
    kpiRequired: false,
    kpiType: null,
  }
};

// ============================================================
// KPI RULES BY CATEGORY
// ============================================================

const KPI_RULES = {
  VANHANH_PHOTHONG: {
    measurementBasis: 'HOURS_WORKED',
    calculation: 'Số giờ làm thực tế / Số giờ quy định',
    whatGetsKPI: 'Người quản lý / CTV giới thiệu nhận KPI dựa trên giờ làm của worker',
    examples: [
      'Worker A làm 200 giờ/tháng → Quản lý X được +200 KPI points',
      'Worker B làm 180 giờ/tháng → CTV Y được +180 KPI points'
    ]
  },
  
  VANHANH_VANPHONG: {
    measurementBasis: 'TASK_COMPLETION',
    calculation: 'Số task hoàn thành / Số task được giao',
    whatGetsKPI: 'Worker trực tiếp có KPI, được đánh giá bởi quản lý',
    examples: [
      'Worker hoàn thành 8/10 task → KPI: 80%',
      'Worker có 5/5 KPI đạt → Thưởng KPIs'
    ]
  },
  
  VANHANH_CONGXUONG: {
    measurementBasis: 'NO_KPI',
    calculation: 'Không áp dụng KPI',
    whatGetsKPI: 'Không có KPI cho worker, chỉ theo dõi giờ máy',
    examples: [
      'Chỉ cần quẹt thẻ đúng giờ',
      'Không có đánh giá KPI cá nhân'
    ]
  }
};
```

### 7.3. Status Transition Rules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    STATUS TRANSITION RULES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CHODUYET ────[HR duyệt]────────▶ DANG_LAM                              │
│     │                                 │                                  │
│     │                                 ▼                                  │
│     │                          ┌──────────┐                              │
│     │                          │ TAM_NGHI │◀───[Request nghỉ phép]──┐  │
│     │                          └──────────┘                            │  │
│     │                                 │                                  │  │
│     │                          [HR duyệt nghỉ]                        │  │
│     │                                 │                                  │  │
│     │                                 ▼                                  │  │
│     │                          ┌──────────┐                              │
│     └─[HR từ chối]──────▶  NGHIVIEC  │                                  │  │
│     │                          └──────────┘                              │  │
│     │                                 │                                  │  │
│     │                          [Tự ý nghỉ/                             │  │
│     │                           vi phạm]                               │  │
│     │                                 │                                  │  │
│     ▼                                 ▼                                  │  │
│  BLACKLIST ◀─────────────────────────────────────────                   │  │
│                                                                          │
│  VALID TRANSITIONS:                                                      │
│  ─────────────────                                                       │
│  CHODUYET    → DANG_RAIN, DANG_LAM, NGHIVIEC, BLACKLIST                │
│  DANG_RAIN   → DANG_LAM, NGHIVIEC, BLACKLIST (Pool → gán vào dự án)   │
│  DANG_LAM    → DANG_RAIN, TAMNGHI, NGHIVIEC, BLACKLIST                │
│  TAMNGHI     → DANG_LAM, DANG_RAIN, NGHIVIEC                          │
│  NGHIVIEC    → (terminal state, có thể reactivate → CHODUYET)         │
│  BLACKLIST   → (terminal state)                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3.1. Talent Pool - Đang rảnh (DANG_RAIN)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TALENT POOL - ĐANG RẢNH                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ĐỊNH NGHĨA:                                                              │
│  ───────────                                                               │
│  "Đang rảnh" (DANG_RAIN) là trạng thái của worker khi:                   │
│  • Đã đăng ký / được nhập vào hệ thống                                   │
│  • CHƯA được gán vào dự án nào HOẶC                                        │
│  • Đã xong dự án cũ, đang chờ dự án mới                                   │
│                                                                             │
│  ĐÂY KHÔNG PHẢI LÀ LOẠI LAO ĐỘNG, MÀ LÀ TRẠNG THÁI!                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CÁC LOẠI LAO ĐỘNG (WorkerCategory)               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • VANHANH_PHOTHONG (Phổ thông - vận hành)                         │   │
│  │  • VANHANH_VANPHONG (Văn phòng - internal)                         │   │
│  │  • VANHANH_CONGXUONG (Công xưởng)                                   │   │
│  │  • THUENGOAI (Thuê ngoài cho vendor)                               │   │
│  │  • GIOITHIEU_HH (Giới thiệu hưởng hoa hồng)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CÁC TRẠNG THÁI (WorkStatus)                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  • CHODUYET (Chờ duyệt hồ sơ)                                      │   │
│  │  • DANG_LAM (Đang làm việc - đã được gán dự án)                    │   │
│  │  • DANG_RAIN ★ (Đang rảnh - TRONG POOL)                            │   │
│  │  • TAMNGHI (Tạm nghỉ)                                               │   │
│  │  • NGHIVIEC (Nghỉ việc)                                            │   │
│  │  • BLACKLIST (Blacklist)                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3.2. Data Isolation - Sale/NVKD chỉ thấy POOL của mình

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA ISOLATION - TALENT POOL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YÊU CẦU NGHIÊM NGẶT:                                                    │
│  ═══════════════════════════                                               │
│  Sale/NVKD chỉ thấy WORKERS mà MÌNH đã nhập hoặc được phân công!        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SALE A - OwnerID = 'sale_A'                      │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✓ Thấy: Worker do sale_A nhập                                     │   │
│  │  ✓ Thấy: Worker do sale_A được phân công quản lý                   │   │
│  │  ✗ Không thấy: Worker của sale_B                                   │   │
│  │  ✗ Không thấy: Worker của sale_C                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SALE B - OwnerID = 'sale_B'                     │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ✓ Thấy: Worker do sale_B nhập                                      │   │
│  │  ✓ Thấy: Worker do sale_B được phân công quản lý                   │   │
│  │  ✗ Không thấy: Worker của sale_A                                   │   │
│  │  ✗ Không thấy: Worker của HR (HRP_DIRECT)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  DATABASE IMPLEMENTATION:                                                  │
│  ─────────────────────────                                                │
│                                                                             │
│  workers table:                                                            │
│  ├── id, fullName, phone, ...                                             │
│  ├── ownerId         -- FK → users.id (người nhập/quản lý chính)        │
│  ├── assignedToId    -- FK → users.id (người phụ trách hiện tại)       │
│  └── sourceType      -- HRP_DIRECT | VENDOR_SUPPLIED | CTV_REFERRAL    │
│                                                                             │
│  API QUERIES:                                                              │
│  ───────────                                                               │
│                                                                             │
│  GET /api/talent-pool                                                      │
│  → WHERE ownerId = currentUser.id OR assignedToId = currentUser.id       │
│                                                                             │
│  KHÔNG CÓ API nào cho phép xem toàn bộ pool!                             │
│  (Trừ khi user có role = ADMIN hoặc HR_MANAGER)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
```

### 7.4. Worker Assignment - Hệ thống UserID Primary/Secondary

**Yêu cầu nghiệp vụ:**
- Mỗi Worker có **UserID gốc (Primary)** - được tạo khi đăng ký, không thay đổi
- Khi được gán vào dự án, sẽ tạo **UserID thứ cấp (Secondary)** - dùng cho chấm công/tính lương
- Khi chuyển dự án, UserID thứ cấp sẽ thay đổi theo dự án mới
- KPI của người quản lý/CTV được tính dựa trên giờ làm việc của worker được gán

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WORKER ASSIGNMENT MODEL                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         WORKER (Primary Entity)                       │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │ id              : UUID (Primary Key)                        │     │   │
│  │  │ userId          : string "USR-001" (Primary UserID - gốc) │     │   │
│  │  │ fullName        : string                                  │     │   │
│  │  │ phone           : string                                  │     │   │
│  │  │ sourceType      : enum (HRP_DIRECT|VENDOR_SUPPLIED|CTV)   │     │   │
│  │  │ workerCategory  : enum (PHOTHONG|VANPHONG|CONGXUONG...)  │     │   │
│  │  │ workStatus     : enum (CHODUYET|DANG_LAM|...)          │     │   │
│  │  │ createdAt      : timestamp                               │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                               │                                        │   │
│  │                               │ 1:N                                    │   │
│  │                               ▼                                        │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │              PROJECT_ASSIGNMENT (Bảng gán dự án)          │     │   │
│  │  │  ┌─────────────────────────────────────────────────────┐   │     │   │
│  │  │  │ id                  : UUID (Primary Key)            │   │     │   │
│  │  │  │ workerId            : FK → workers.id                │   │     │   │
│  │  │  │ projectId          : FK → projects.id               │   │     │   │
│  │  │  │                                             │   │     │   │
│  │  │  │ employeeCode       : string "EMP-SAMSUNG-001"  │   │     │   │
│  │  │  │ (Secondary UserID - do cty tiếp nhận tạo)      │   │     │   │
│  │  │  │                                             │   │     │   │
│  │  │  │ assignedDate      : date (ngày bắt đầu)     │   │     │   │
│  │  │  │ endDate          : date (ngày kết thúc, null=nếu đang làm) │   │   │
│  │  │  │ isActive         : boolean                      │   │     │   │
│  │  │  │                                             │   │     │   │
│  │  │  │ managerId        : FK → users.id (Quản lý)    │   │     │   │
│  │  │  │ referrerId       : FK → users.id (CTV giới thiệu) │   │     │   │
│  │  │  │                                             │   │     │   │
│  │  │  │ // KPI sẽ được tính dựa trên giờ làm của worker │   │     │   │
│  │  │  │ // và gán vào managerId hoặc referrerId tùy loại  │   │     │   │
│  │  │  │                                             │   │     │   │
│  │  │  │ status            : enum (ACTIVE|TRANSFERRED|ENDED) │   │     │   │
│  │  │  │ transferReason   : string (lý do chuyển)          │   │     │   │
│  │  │  └─────────────────────────────────────────────────────┘   │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Luồng UserID Primary/Secondary:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USERID ASSIGNMENT FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME: T1 - Worker đăng ký                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ WORKER: Nguyễn Văn A                                             │       │
│  │ userId (Primary): "USR-001" ←──────── Tạo khi đăng ký, không đổi │       │
│  │ workStatus: CHODUYET                                             │       │
│  │ Project Assignments: [] (chưa có)                               │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  TIME: T2 - HR gán vào Dự án Samsung                                      │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ WORKER: Nguyễn Văn A                                             │       │
│  │ userId (Primary): "USR-001"                                      │       │
│  │ workStatus: DANG_LAM                                              │       │
│  │                                                                          │       │
│  │ Project Assignments:                                               │       │
│  │ ┌─────────────────────────────────────────────────────────────┐   │       │
│  │ │ Assignment #1                                                 │   │       │
│  │ │   projectId        : "PRJ-SAMSUNG-001"                       │   │       │
│  │ │   employeeCode     : "EMP-SAMSUNG-001" (Secondary UserID)   │   │       │
│  │ │   managerId        : User #10 (Quản lý Samsung)             │   │       │
│  │ │   referrerId       : User #5 (CTV giới thiệu)               │   │       │
│  │ │   isActive         : true                                    │   │       │
│  │ │   assignedDate     : 2026-08-01                              │   │       │
│  │ └─────────────────────────────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                              │                                              │
│                              ▼                                              │
│  TIME: T3 - Worker chuyển sang Dự án LG                                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ WORKER: Nguyễn Văn A                                             │       │
│  │ userId (Primary): "USR-001"                                      │       │
│  │ workStatus: DANG_LAM                                              │       │
│  │                                                                          │       │
│  │ Project Assignments:                                               │       │
│  │ ┌─────────────────────────────────────────────────────────────┐   │       │
│  │ │ Assignment #1 (cũ)                                          │   │       │
│  │ │   projectId        : "PRJ-SAMSUNG-001"                       │   │       │
│  │ │   employeeCode     : "EMP-SAMSUNG-001"                       │   │       │
│  │ │   isActive         : FALSE ←── Đóng assignment cũ            │   │       │
│  │ │   endDate          : 2026-08-14                               │   │       │
│  │ │   status           : TRANSFERRED                              │   │       │
│  │ └─────────────────────────────────────────────────────────────┘   │       │
│  │ ┌─────────────────────────────────────────────────────────────┐   │       │
│  │ │ Assignment #2 (mới)                                          │   │       │
│  │ │   projectId        : "PRJ-LG-001"                             │   │       │
│  │ │   employeeCode     : "EMP-LG-001" (UserID thứ cấp MỚI)       │   │       │
│  │ │   managerId        : User #20 (Quản lý LG - MỚI)             │   │       │
│  │ │   referrerId       : NULL ←── Không còn CTV nữa              │   │       │
│  │ │   isActive         : TRUE                                     │   │       │
│  │ │   assignedDate     : 2026-08-15                              │   │       │
│  │ └─────────────────────────────────────────────────────────────┘   │       │
│  │                                                                          │       │
│  │ ⚠️ LƯU Ý: KPI từ giờ làm việc từ T1→T2 sẽ tính cho User #5 (CTV)  │       │
│  │            KPI từ giờ làm việc từ T3→... sẽ tính cho User #20 (QL) │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**KPI Calculation dựa trên Worker Assignment:**

```typescript
// KHI TÍNH KPI CHO NGƯỜI QUẢN LÝ/CTV:

async function calculateKPIForManager(managerId: string, month: string) {
  // 1. Tìm tất cả assignment ACTIVE của manager trong tháng đó
  const assignments = await prisma.projectAssignment.findMany({
    where: {
      managerId, // Hoặc referrerId tùy trường hợp
      isActive: true,
      assignedDate: { lte: endOfMonth }
    }
  });
  
  // 2. Với mỗi worker trong assignment, tính tổng giờ làm việc trong tháng
  const kpiPoints = [];
  for (const assignment of assignments) {
    const workerHours = await calculateWorkerHoursInMonth(
      assignment.workerId,
      month,
      assignment.projectId
    );
    
    kpiPoints.push({
      workerId: assignment.workerId,
      projectId: assignment.projectId,
      hoursWorked: workerHours,
      kpiContribution: workerHours // 1 giờ = 1 KPI point
    });
  }
  
  // 3. Tổng hợp KPI cho manager
  return {
    managerId,
    month,
    totalKPIPoints: kpiPoints.reduce((sum, p) => sum + p.kpiContribution, 0),
    breakdown: kpiPoints
  };
}
```

**Chuyển dự án - Transfer Flow:**

```typescript
interface TransferWorkerRequest {
  workerId: string;
  fromProjectId: string;
  toProjectId: string;
  newEmployeeCode: string;
  newManagerId: string;
  newReferrerId?: string;
  transferDate: Date;
  reason: string;
}

// TRANSFER WORKER - PHẢI DÙNG TRANSACTION
async function transferWorker(req: TransferWorkerRequest) {
  return await prisma.$transaction(async (tx) => {
    // 1. Đóng assignment cũ
    await tx.projectAssignment.updateMany({
      where: {
        workerId: req.workerId,
        projectId: req.fromProjectId,
        isActive: true
      },
      data: {
        isActive: false,
        endDate: req.transferDate,
        status: 'TRANSFERRED'
      }
    });
    
    // 2. Tạo assignment mới
    await tx.projectAssignment.create({
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
    
    // 3. Tạo audit log
    await tx.auditLog.create({
      data: {
        action: 'WORKER_TRANSFER',
        workerId: req.workerId,
        fromProject: req.fromProjectId,
        toProject: req.toProjectId,
        reason: req.reason,
        performedBy: getCurrentUserId()
      }
    });
  });
}
```

---

## 8. KIẾN TRÚC VENDOR PORTAL

### 8.1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      VENDOR PORTAL ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      MAIN HRP APPLICATION                        │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│   │  │   Worker    │  │   Admin     │  │   API       │              │   │
│   │  │   Portal    │  │   Portal    │  │   Layer     │              │   │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │   │
│   └─────────┼────────────────┼────────────────┼──────────────────────┘   │
│             │                │                │                           │
│             │                │         ┌──────▼──────┐                   │
│             │                │         │   Shared    │                   │
│             │                │         │   Database  │                   │
│             │                │         └──────┬──────┘                   │
│             │                │                │                           │
│             └────────────────┼────────────────┘                           │
│                              │                                             │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────────────┐
        │            vendor.hrpvietnam.com (Subdomain)            │
        ├──────────────────────────────────────────────────────┤
        │                                                        │
        │   ┌─────────────────────────────────────────────┐    │
        │   │              VENDOR PORTAL UI                 │    │
        │   │                                              │    │
        │   │   ┌─────────────┐  ┌──────────────────────┐  │    │
        │   │   │  Dashboard  │  │  Project List        │  │    │
        │   │   │  (Stats)    │  │  (Open Positions)   │  │    │
        │   │   └─────────────┘  └──────────────────────┘  │    │
        │   │                                              │    │
        │   │   ┌─────────────────────────────────────┐   │    │
        │   │   │  Worker Input Form                  │   │    │
        │   │   │  (Submit worker info for review)    │   │    │
        │   │   └─────────────────────────────────────┘   │    │
        │   │                                              │    │
        │   │   ┌─────────────────────────────────────┐   │    │
        │   │   │  Worker Status Tracking             │   │    │
        │   │   │  (Pending | Approved | Rejected)    │   │    │
        │   │   └─────────────────────────────────────┘   │    │
        │   │                                              │    │
        │   └─────────────────────────────────────────────┘    │
        │                                                        │
        └────────────────────────────────────────────────────────┘
```

### 8.2. Vendor User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VENDOR USER FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

1. VENDOR LOGIN
   Vendor đăng nhập tại vendor.hrpvietnam.com
   → Hệ thống xác thực via JWT
   → Gán role: VENDOR_ADMIN hoặc VENDOR_STAFF

2. DASHBOARD
   Vendor thấy:
   ├── Tổng số NLĐ đã gửi
   ├── Số được duyệt / từ chối
   ├── Số đang chờ duyệt
   └── Thu nhập ước tính từ hoa hồng (nếu có)

3. VIEW OPEN PROJECTS
   Vendor thấy danh sách dự án đang cần người:
   ├── Tên dự án
   ├── Số lượng cần tuyển
   ├── Yêu cầu (tuổi, giới tính, kỹ năng)
   ├── Địa điểm
   └── Ngày bắt đầu dự kiến
   → Vendor có thể lọc theo khu vực / ngành

4. INPUT WORKER INFO
   Vendor nhấn "Gửi ứng viên" cho 1 dự án:
   Form nhập:
   ├── Họ và tên (required)
   ├── Số điện thoại (required)
   ├── Ngày sinh
   ├── Giới tính
   ├── Số CCCD
   ├── Khu vực
   ├── Kinh nghiệm (textarea)
   └── Upload ảnh CCCD (optional)
   
   → Submit tạo Worker với:
      sourceType = 'VENDOR_SUPPLIED'
      sourceVendorId = <current_vendor_id>
      status = 'CHODUYET'
      workerCategory = 'THUENGOAI' (mặc định)

5. TRACK STATUS
   Vendor theo dõi danh sách đã gửi:
   ├── CHỜ DUYỆT: Đang chờ HRP xem xét
   ├── ĐƯỢC DUYỆT: Đã được chấp nhận, chờ onboarding
   ├── TỪ CHỐI: Không đáp ứng yêu cầu (có ghi chú lý do)
   
   → Nhận thông báo khi có cập nhật

6. VENDOR BILLING (Phase 2)
   Vendor xem đối soát:
   ├── Tổng ngày công của NLĐ vendor
   ├── Đơn giá B2B thỏa thuận
   ├── Tổng tiền phải thanh toán
   → Xuất biên bản đối soát
```

### 8.3. Feature Flags cho Vendor Worker

```typescript
// Worker có sourceType = 'VENDOR_SUPPLIED' sẽ bị ẩn:

const VENDOR_WORKER_RESTRICTIONS = {
  hiddenFeatures: [
    'SALARY_SLIP',        // Không xem lương HRP
    'ADVANCE_REQUEST',    // Không đề nghị tạm ứng
    'TIMEKEEPING_MACHINE', // Không dùng máy chấm công HRP
  ],
  
  visibleFeatures: [
    'PROJECT_INFO',       // Xem thông tin dự án
    'ATTENDANCE_GPS',     // Check-in GPS
    'ATTENDANCE_HISTORY', // Xem lịch sử check-in
    'FEEDBACK',           // Phản ánh vấn đề
  ]
};
```

### 8.4. URL Structure

```
Main App:          https://hrpvietnam.com/
Admin Portal:       https://hrpvietnam.com/admin/
Vendor Portal:      https://vendor.hrpvietnam.com/

API Base:          https://api.hrpvietnam.com/
Auth:              https://api.hrpvietnam.com/auth/
Workers:           https://api.hrpvietnam.com/workers/
Projects:          https://api.hrpvietnam.com/projects/
Vendors:           https://api.hrpvietnam.com/vendors/
```

> **Domain chính thức:** hrpvietnam.com | hrpvietnam.vn

---

## 9. KIẾN TRÚC CHẤM CÔNG & ĐỐI SOÁT

> **Nghiệp vụ thực tế:**
> - **File chấm công từ đối tác:** Dùng để **TÍNH LƯƠNG**. Bên đối tác tự chấm công và gửi file Excel/PDF cho HRP.
> - **GPS Check-in:** Dùng để **QUẢN LÝ Ý THỨC** người lao động. Worker phải check-in hàng ngày bằng selfie + GPS.

### 9.1. Mô hình Tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HAI LOẠI CHẤM CÔNG - HAI MỤC ĐÍCH KHÁC NHAU           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐    │
│  │  FILE CHẤM CÔNG           │    │  GPS CHECK-IN                   │    │
│  │  (Từ đối tác)            │    │  (Ý thức NLĐ)                  │    │
│  ├─────────────────────────────┤    ├─────────────────────────────────┤    │
│  │  • Đối tác tự chấm       │    │  • Worker tự check-in          │    │
│  │  • Gửi file Excel/PDF    │    │  • Selfie + GPS                │    │
│  │  • Kế toán import        │    │  • Hàng ngày                   │    │
│  │                            │    │                                 │    │
│  │  MỤC ĐÍCH:               │    │  MỤC ĐÍCH:                     │    │
│  │  → TÍNH LƯƠNG            │    │  → QUẢN LÝ Ý THỨC             │    │
│  │  → KPI cho Sale           │    │  → Tạo thói quen làm việc      │    │
│  │  → Đối soát Vendor       │    │  → Đánh vào ý thức            │    │
│  └─────────────────────────────┘    └─────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2. GPS Check-in (Quản lý ý thức)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GPS CHECK-IN FLOW (Ý thức NLĐ)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. WORKER MỞ APP                                                          │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  Worker nhấn nút "CHECK-IN" hàng ngày                        │   │
│     │  (Tạo thói quen, thể hiện ý thức trách nhiệm)              │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  2. CHỤP SELFIE + GPS                                                     │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  📷 Camera trước                    📍 GPS Location           │   │
│     │  Selfie + Coordinates                Time + Location            │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  3. UPLOAD TO SERVER                                                      │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  POST /api/v1/attendance/checkin                               │   │
│     │  { workerId, selfieImage, gpsCoordinates, timestamp }          │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  4. ADMIN THEO DÕI                                                        │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • Xem danh sách check-in GPS hàng ngày                      │   │
│     │  • Phát hiện worker nào không check-in                       │   │
│     │  • Dùng làm căn cứ đánh giá ý thức (không dùng tính lương) │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3. Import Dữ liệu Chấm công (Tính lương)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATTENDANCE IMPORT WORKFLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UPLOAD FILE                                                            │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  Supported: .xlsx, .xls, .csv, .pdf                            │   │
│     │  Example: Mã NV | Họ tên | Ngày | Giờ vào | Giờ ra           │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  2. AUTO-MAPPING & VALIDATION                                              │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • Parse file → structured data                                   │   │
│     │  • Map employeeCode → Worker (HRP)                              │   │
│     │  • Validate: worker exists? date valid? on project?              │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  3. ADMIN REVIEW & APPROVE                                                 │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • Review unmatched/invalid rows                                  │   │
│     │  • Select payroll period (month/year)                          │   │
│     │  • Confirm import                                               │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                              │                                                │
│  4. AUTO-CALCULATION                                                       │
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │  • Calculate salary per worker                                   │   │
│     │  • Update KPI for manager/referrer                              │   │
│     │  • Generate payslip                                             │   │
│     └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.3. Tính Lương & KPI

```typescript
// PAYROLL CALCULATION
interface PayrollResult {
  workerId: string;
  employeeCode: string;
  totalDaysWorked: number;
  totalHoursWorked: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  totalSalary: number;
  tax: number;
  netSalary: number;
}

async function calculatePayroll(workerId: string, projectId: string, month: number, year: number) {
  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      workerId,
      projectId,
      workDate: { gte: startOfMonth, lt: startOfNextMonth }
    }
  });
  
  const totalDaysWorked = attendance.length;
  const totalHoursWorked = attendance.reduce((sum, r) => sum + r.hoursWorked, 0);
  const overtimeHours = attendance.reduce((sum, r) => sum + r.overtimeHours, 0);
  
  const dailyRate = worker.salaryPerDay;
  const hourlyRate = dailyRate / 8;
  const baseSalary = totalDaysWorked * dailyRate;
  const overtimePay = overtimeHours * hourlyRate * 1.5;
  const netSalary = baseSalary + overtimePay - tax - insurance;
  
  return { workerId, totalDaysWorked, totalHoursWorked, baseSalary, netSalary };
}

// KPI CALCULATION FOR MANAGER
async function calculateKPIForManager(managerId: string, month: number, year: number) {
  const assignments = await prisma.projectAssignment.findMany({
    where: { managerId, isActive: true }
  });
  
  let totalKPI = 0;
  for (const assignment of assignments) {
    const hoursWorked = await getWorkerHours(assignment.workerId, month, year);
    totalKPI += hoursWorked; // 1 hour = 1 KPI point
  }
  
  await prisma.kpiRecord.create({
    data: { userId: managerId, month, year, totalKPI }
  });
  
  return { managerId, totalKPI };
}
```

### 9.4. Database Schema

```sql
-- GPS CHECK-IN LOG (Quản lý ý thức)
CREATE TABLE gps_checkin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  worker_id UUID NOT NULL REFERENCES workers(id),

  -- GPS data
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  gps_accuracy DECIMAL(5, 2), -- meters

  -- Selfie
  selfie_image_url TEXT NOT NULL,

  -- Timestamp
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  work_date DATE NOT NULL,

  -- Device info
  device_info JSONB,

  -- Metadata
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INVALID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gps_worker_date ON gps_checkin_logs (worker_id, work_date);

-- ATTENDANCE RECORD (from partner file import - tính lương)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  assignment_id UUID NOT NULL REFERENCES project_assignments(id),

  work_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  hours_worked DECIMAL(5,2),

  is_late BOOLEAN DEFAULT FALSE,
  overtime_hours DECIMAL(5,2) DEFAULT 0,

  source VARCHAR(20) DEFAULT 'IMPORTED',
  import_batch_id UUID REFERENCES import_batches(id),

  UNIQUE(worker_id, project_id, work_date)
);

-- IMPORT BATCH
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  imported_count INTEGER,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYROLL RECORD
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id),
  project_id UUID NOT NULL REFERENCES projects(id),

  month INTEGER NOT NULL,
  year INTEGER NOT NULL,

  total_days DECIMAL(5,2),
  total_hours DECIMAL(6,2),
  overtime_hours DECIMAL(5,2),

  base_salary DECIMAL(12,2),
  overtime_pay DECIMAL(12,2),
  total_salary DECIMAL(12,2),
  tax DECIMAL(12,2),
  net_salary DECIMAL(12,2),

  status VARCHAR(20) DEFAULT 'DRAFT',
  UNIQUE(worker_id, month, year)
);

-- KPI RECORD
CREATE TABLE kpi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_kpi DECIMAL(10,2),
  breakdown JSONB,
  UNIQUE(user_id, month, year)
);
```

### 9.5. API Endpoints

```typescript
// ========== GPS CHECK-IN (Ý thức) ==========

// Worker check-in GPS
POST   /api/v1/attendance/checkin
  Body: {
    selfieImage: File,
    gpsCoordinates: { latitude, longitude, accuracy },
    workDate?: string
  }
  Response: { success, checkinId, time }

// Get GPS check-in history (Worker)
GET    /api/v1/attendance/history
  Query: { workerId, startDate, endDate }

// Admin: Get all GPS check-ins
GET    /api/v1/admin/attendance/gps-logs
  Query: { projectId, workerId, date }

// ========== FILE IMPORT (Tính lương) ==========

// Upload file chấm công
POST   /api/v1/attendance/import
  Body: FormData (file)
  Response: { batchId, rowCount, preview }

// Validate & mapping
POST   /api/v1/attendance/import/validate
  Body: { batchId, mapping }

// Approve import
POST   /api/v1/attendance/import/approve
  Body: { batchId, month, year, projectId }

// Get payroll summary
GET    /api/v1/payroll/summary
  Query: { projectId, month, year }

// Get KPI report
GET    /api/v1/kpi/report
  Query: { managerId, month, year }
```

---

## 10. TECH STACK & INFRASTRUCTURE

### 10.1. Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend Web** | Next.js 14 (App Router) + TypeScript | SSR/SSG, Serverless API, great DX |
| **UI Components** | TailwindCSS + Shadcn/UI | Beautiful, accessible |
| **Frontend Admin** | Next.js (same repo) + Recharts | Dashboard, charts |
| **Backend** | Next.js Route Handlers | Serverless on Vercel, type-safe |
| **ORM** | Prisma | Type-safe, great DX |
| **Database** | PostgreSQL (Neon Serverless) | ACID, serverless, auto-scaling |
| **Cache** | Vercel KV (Redis) | Session, rate limiting |
| **Queue** | Vercel Cron / BullMQ | Job processing |
| **Storage** | Vercel Blob / S3 | Images, files |
| **Auth** | JWT + OTP SMS + Zalo Login | Stateless, multi-method |
| **SMS** | Viettel/VNPT API | Vietnam SMS |
| **Mobile** | Capacitor | Web → Native |
| **CI/CD** | GitHub Actions + Vercel | Automation |
| **Hosting** | Vercel | Serverless, global CDN |

> **⚠️ KHÔNG dùng Fastify:** Fastify không tương thích Vercel Serverless (cold-start chậm, timeout). Dùng Next.js Route Handlers thay thế.

### 10.2. Project Structure

```
hrp/
├── apps/
│   ├── web/                    # Worker Portal (Next.js App Router)
│   ├── admin/                  # Admin Dashboard (Next.js)
│   └── vendor/                 # Vendor Portal (Next.js, subdomain)
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Migrations
├── docs/                       # Documentation
└── README.md
```

> **Kiến trúc:** Monorepo với Next.js (App Router). Frontend + API cùng repo, chạy Serverless trên Vercel.

### 10.3. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hrp

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=7d

# SMS Gateway
SMS_API_KEY=your-sms-api-key
SMS_PROVIDER=viettel|vnpt|twilio

# S3 Storage
S3_BUCKET=hrp-uploads
S3_REGION=ap-southeast-1
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx

# App URLs
APP_URL=https://hrpvietnam.com
API_URL=https://api.hrpvietnam.com
VENDOR_URL=https://vendor.hrpvietnam.com
```

---

## 10B. ARCHITECTURE BLUEPRINT - Vercel/Serverless

### 10B.0. ⚠️ LƯU Ý QUAN TRỌNG: Backend Tech Stack

> **⚠️ KHÔNG DÙNG FASTIFY!**
> Fastify là framework xuất sắc cho máy chủ truyền thống (long-running server), nhưng **không tương thích Vercel Serverless** (cold-start chậm, timeout).
>
> **DÙNG: Next.js App Router (Route Handlers)** - chạy Serverless cực kỳ mượt trên Vercel.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TECH STACK QUY ĐỊNH                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ DÙNG:                                                                  │
│  ────────                                                                  │
│  • Frontend: Next.js 14 (App Router) + React                            │
│  • Backend:  Next.js Route Handlers (/app/api/*)                        │
│  • Database: PostgreSQL (Neon Serverless) + Prisma                       │
│  • Hosting:  Vercel (Serverless)                                        │
│                                                                             │
│  ❌ KHÔNG DÙNG:                                                           │
│  ─────────────────                                                          │
│  • Fastify (không tương thích Vercel)                                    │
│  • Vite riêng (dùng Next.js built-in)                                    │
│  • VPS truyền thống (dùng Vercel Serverless)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Rất quan trọng cho AI Coding và Mobile App Packaging!**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHÂN TÁCH FRONTEND vs API                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  KHI DÙNG NEXT.JS + CAPACITOR MOBILE APP:                                │
│  ═══════════════════════════════════════════════                          │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     WEB VERSION (Vercel)                            │   │
│   │                                                                       │   │
│   │   ┌──────────────────────┐      ┌──────────────────────────────┐   │   │
│   │   │   FRONTEND          │      │   API BACKEND                 │   │   │
│   │   │   /worker/*        │      │   /api/*                       │   │   │
│   │   │   /admin/*        │      │   (Serverless Functions)        │   │   │
│   │   │   (React Pages)    │      │   Nằm trên Vercel Server      │   │   │
│   │   └──────────────────────┘      └──────────────────────────────┘   │   │
│   │            │                                │                       │   │
│   └────────────┼────────────────────────────────┼───────────────────────┘   │
│                │                                │                             │
│                ▼                                ▼                             │
│   ┌─────────────────────────────┐      ┌──────────────────────────────┐   │
│   │   MOBILE APP (Capacitor)   │      │   DATABASE / SERVICES       │   │
│   │                                                                       │   │
│   │   FRONTEND được export ra   │      │   API Backend vẫn chạy     │   │
│   │   thành file tĩnh (.apk)   │─────▶│   trên Vercel Serverless   │   │
│   │   và nhét vào điện thoại  │      │   Functions                 │   │
│   │                                                                       │   │
│   │   ⚠️ CHỈ CÓ GIAO DIỆN    │      │   ⚠️ API VẪN Ở ĐÂY        │   │
│   └─────────────────────────────┘      └──────────────────────────────┘   │
│                                                                             │
│  ĐIỀU NÀY CÓ NGHĨA LÀ:                                                   │
│  ──────────────────────────────────────                                    │
│  • AI Coding phải tách biệt rõ ràng Client vs Server code               │
│  • API calls phải dùng absolute URLs (không dùng relative paths)       │
│  • Frontend không chứa business logic, chỉ gọi API                      │
│  • CORS phải được config đúng cho mobile app                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10B.1. Tổng quan kiến trúc Vercel Serverless

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERCEL SERVERLESS ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        VERCEL EDGE NETWORK                          │   │
│   │   (CDN, DDoS Protection, Global Distribution)                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     NEXT.JS APPLICATION                              │   │
│   │                                                                       │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│   │   │   /worker/* │  │  /admin/*    │  │  /api/*      │             │   │
│   │   │  (Web App)  │  │ (Dashboard)  │  │  (API Routes)│             │   │
│   │   └──────────────┘  └──────────────┘  └──────────────┘             │   │
│   │                                                                       │   │
│   │   ┌──────────────────────────────────────────────────────────────┐   │   │
│   │   │              SERVERLESS FUNCTIONS (API Routes)                 │   │   │
│   │   │   • /api/auth/*    • /api/workers/*  • /api/attendance/*   │   │   │
│   │   │   • /api/projects/* • /api/payroll/*  • /api/vendors/*     │   │   │
│   │   └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                       │   │
│   │   ┌──────────────────────────────────────────────────────────────┐   │   │
│   │   │                    ISR / STATIC REGENERATION                   │   │   │
│   │   │         (Job Board, Public Pages - cached 60s-1h)            │   │   │
│   │   └──────────────────────────────────────────────────────────────┘   │   │
│   │                                                                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│         ┌──────────────────────────┼──────────────────────────┐              │
│         │                          │                          │              │
│         ▼                          ▼                          ▼              │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐        │
│   │  SUPABASE /   │      │   UPSTASH     │      │    S3 /      │        │
│   │  NEON         │      │   QSTASH      │      │  VERCEL BLOB │        │
│   │  (Database)   │      │   (Queue)     │      │  (Storage)   │        │
│   └───────────────┘      └───────────────┘      └───────────────┘        │
│         │                          │                          │              │
│         │                          ▼                          │              │
│         │                  ┌───────────────┐                   │              │
│         │                  │  UPSTASH      │                   │              │
│         │                  │  REDIS        │                   │              │
│         │                  │  (Cache/Rate) │                   │              │
│         │                  └───────────────┘                   │              │
│         │                                                       │              │
│         └───────────────────────────┬───────────────────────────┘              │
│                                   │                                          │
│                                   ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    EXTERNAL SERVICES                                 │   │
│   │   • SMS Gateway (Viettel/VNPT)   • Zalo OA API                      │   │
│   │   • T&A Machine Webhook          • Email Service                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10B.2. Database Connection Pooling

**Vấn đề:** Vercel Serverless Functions có thời gian chạy ngắn (10-30s), mỗi request có thể tạo connection mới → nhanh chóng exhaust connection pool.

**Giải pháp:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE CONNECTION POOLING STRATEGY                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OPTION 1: Supabase/Neon Native Pooler (Recommended)                       │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  DATABASE_URL=postgresql://user:pass@db.supabase.co:6543/postgres?          │
│                 ├──────────────────────┬────────────────────────────────┘   │
│                                         │                                    │
│                                         ▼                                    │
│                              ┌──────────────────┐                            │
│                              │  Supabase Pooler │                            │
│                              │  (PgBouncer)     │                            │
│                              │  port: 6543       │                            │
│                              └────────┬─────────┘                            │
│                                       │                                      │
│                                       ▼                                      │
│                              ┌──────────────────┐                            │
│                              │  Neon/Supabase   │                            │
│                              │  PostgreSQL      │                            │
│                              │  (Managed)        │                            │
│                              └──────────────────┘                            │
│                                                                             │
│  OPTION 2: External PgBouncer + Managed Database                            │
│  ────────────────────────────────────────────────────────────────────────   │
│                                                                             │
│  ┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐      │
│  │ Vercel       │─────▶│  PgBouncer        │─────▶│  PostgreSQL       │      │
│  │ Functions    │      │  (Separate VPS)   │      │  (RDS/Managed)   │      │
│  └──────────────┘      │  pool_mode=       │      └──────────────────┘      │
│                        │  transaction       │                                │
│                        │  max_connections=20│                                │
│                        └──────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Prisma Configuration:**

```typescript
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  // Connection pool URL (use pooler port)
  url            = env("DATABASE_URL")
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// prisma/index.ts - Singleton pattern for connection
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 10B.3. ACID Transactions Implementation

**Nguyên tắc:** Mọi thao tác ghi nhiều bảng phải dùng transaction.

```typescript
// ✅ CORRECT: Transaction cho multi-table operations
async function assignWorkerToProject(workerId: string, projectId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify worker exists and is eligible
    const worker = await tx.worker.findUniqueOrThrow({
      where: { id: workerId }
    });
    
    if (worker.workStatus !== 'CHODUYET' && worker.workStatus !== 'CHO_VIEC') {
      throw new Error('Worker không trong trạng thái có thể gán');
    }
    
    // 2. Generate employee code
    const employeeCode = await generateEmployeeCode(projectId);
    
    // 3. Create assignment
    const assignment = await tx.projectAssignment.create({
      data: {
        workerId,
        projectId,
        employeeCode,
        assignedDate: new Date(),
        isActive: true,
        status: 'ACTIVE'
      }
    });
    
    // 4. Update worker status
    await tx.worker.update({
      where: { id: workerId },
      data: { workStatus: 'DANG_LAM' }
    });
    
    // 5. Create audit log
    await tx.auditLog.create({
      data: {
        action: 'WORKER_ASSIGNED',
        workerId,
        projectId,
        performedAt: new Date()
      }
    });
    
    return assignment;
  }, {
    isolationLevel: 'Serializable', // Highest isolation for financial data
    timeout: 10000 // 10 seconds max
  });
}

// ❌ WRONG: Không dùng transaction cho multi-table
async function badAssignWorkerToProject(workerId: string, projectId: string) {
  await prisma.worker.update({...}); // Worker updated
  await prisma.projectAssignment.create({...}); // Assignment created
  // Nếu create fail → worker updated nhưng không có assignment!
  // Data corruption!
}
```

### 10B.4. Idempotency Keys

**Mục đích:** Ngăn duplicate entries khi client retry do network lag.

```typescript
// IDEMPOTENCY IMPLEMENTATION

// 1. Database table for tracking idempotency
// prisma/schema.prisma
model IdempotencyKey {
  id        String   @id // The idempotency key from client
  response  Json?    // Cached response
  status    String   // PENDING, COMPLETED, FAILED
  createdAt DateTime @default(now())
  expiresAt DateTime // Auto-cleanup

  @@index([expiresAt])
}

// 2. Middleware/Utility
async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Check if key exists
  const existing = await prisma.idempotencyKey.findUnique({
    where: { id: key }
  });
  
  if (existing) {
    if (existing.status === 'COMPLETED' && existing.response) {
      return existing.response as T; // Return cached response
    }
    if (existing.status === 'PENDING') {
      throw new Error('Request is being processed');
    }
  }
  
  // Create new key with PENDING status
  await prisma.idempotencyKey.create({
    data: {
      id: key,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + ttlSeconds * 1000)
    }
  });
  
  try {
    const result = await operation();
    
    // Update with response
    await prisma.idempotencyKey.update({
      where: { id: key },
      data: {
        status: 'COMPLETED',
        response: result as any
      }
    });
    
    return result;
  } catch (error) {
    await prisma.idempotencyKey.update({
      where: { id: key },
      data: { status: 'FAILED' }
    });
    throw error;
  }
}

// 3. Usage in API route
export async function POST(request: Request) {
  const body = await request.json();
  const idempotencyKey = request.headers.get('x-idempotency-key');
  
  if (!idempotencyKey) {
    return Response.json(
      { error: 'Idempotency key required' },
      { status: 400 }
    );
  }
  
  return withIdempotency(
    `checkin:${idempotencyKey}`,
    async () => {
      // Your actual business logic here
      return await processCheckin(body);
    }
  );
}
```

### 10B.5. Concurrency Control (Locking)

```typescript
// OPTIMISTIC CONCURRENCY CONTROL

// 1. Add version field to model
model Project {
  id        String   @id
  quota     Int
  filled    Int      @default(0)
  version   Int      @default(0) // For OCC
  
  @@index([id, version])
}

// 2. Update with version check
async function allocateWorkerToVendor(
  projectId: string,
  workerId: string
) {
  // Retry loop for optimistic locking
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Read current state
        const project = await tx.project.findUniqueOrThrow({
          where: { id: projectId }
        });
        
        // Check quota
        if (project.filled >= project.quota) {
          throw new Error('Project quota exceeded');
        }
        
        // Update with version increment
        const updated = await tx.project.update({
          where: {
            id: projectId,
            version: project.version // Optimistic lock check
          },
          data: {
            filled: { increment: 1 },
            version: { increment: 1 }
          }
        });
        
        // Create allocation record
        await tx.vendorAllocation.create({
          data: {
            projectId,
            workerId,
            allocatedAt: new Date()
          }
        });
        
        return updated;
      });
      
      return result; // Success
    } catch (error) {
      if (error.code === 'P2034' && attempt < maxRetries - 1) {
        // Version conflict, retry
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}

// PESSIMISTIC LOCKING (for critical sections)
async function transferWorkerWithLock(workerId: string, toProjectId: string) {
  return await prisma.$transaction(async (tx) => {
    // Acquire advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${workerId.hashCode()})`;
    
    // Critical section - safe to modify
    const worker = await tx.worker.findUniqueOrThrow({
      where: { id: workerId }
    });
    
    // ... transfer logic ...
  });
}
```

### 10B.6. Background Processing (Message Queues)

**Vấn đề:** Vercel Functions có timeout (10-30s). Bulk operations (payroll calculation, mass notifications) không thể chạy đồng bộ.

```typescript
// BACKGROUND PROCESSING WITH UPSTASH QSTASH

// 1. API Route - Enqueue job
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate request
  if (body.type === 'BULK_PAYROLL') {
    const jobId = crypto.randomUUID();
    
    // Enqueue to QStash
    await fetch('https://qstash.upstash.io/v2/enqueue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.QSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `${process.env.API_URL}/api/jobs/payroll-calculation`,
        body: { jobId, projectId: body.projectId, month: body.month },
        retries: 3,
        delay: 5 // Delay 5 seconds
      })
    });
    
    return Response.json({
      jobId,
      status: 'QUEUED',
      message: 'Payroll calculation started'
    });
  }
}

// 2. Background Job Handler (separate API route)
export async function processPayrollCalculation(req: NextRequest) {
  const { jobId, projectId, month } = await req.json();
  
  // Process in batches to avoid memory issues
  const batchSize = 100;
  let offset = 0;
  let processed = 0;
  
  while (true) {
    const workers = await prisma.projectAssignment.findMany({
      where: {
        projectId,
        isActive: true
      },
      skip: offset,
      take: batchSize,
      include: { worker: true }
    });
    
    if (workers.length === 0) break;
    
    // Process batch
    for (const assignment of workers) {
      await calculateWorkerSalary(assignment, month);
      processed++;
    }
    
    offset += batchSize;
  }
  
  // Update job status
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETED', result: { processed } }
  });
  
  return Response.json({ processed });
}

// 3. Progress polling endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId }
  });
  
  return Response.json({
    jobId: job?.id,
    status: job?.status,
    progress: job?.result?.processed || 0
  });
}
```

### 10B.7. Caching Strategy

```typescript
// ISR FOR PUBLIC PAGES

// app/worker/job-board/page.tsx
export const revalidate = 300; // Revalidate every 5 minutes

async function getJobBoard() {
  // Try cache first
  const cached = await redis.get('job_board:active');
  if (cached) return JSON.parse(cached);
  
  // Fetch from DB
  const jobs = await prisma.project.findMany({
    where: { status: 'ACTIVE', isPublic: true },
    include: { client: true },
    orderBy: { createdAt: 'desc' }
  });
  
  // Cache for 5 minutes
  await redis.set('job_board:active', JSON.stringify(jobs), 'EX', 300);
  
  return jobs;
}

// CACHE FOR AUTHENTICATED BUT RARELY CHANGED DATA
export async function getWorkerProfile(workerId: string) {
  const cacheKey = `worker:profile:${workerId}`;
  
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: { assignments: { where: { isActive: true } } }
  });
  
  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(worker), 'EX', 3600);
  
  return worker;
}

// CACHE INVALIDATION
async function invalidateWorkerCache(workerId: string) {
  await redis.del(`worker:profile:${workerId}`);
  await redis.del(`worker:attendance:${workerId}`);
  await redis.del(`worker:payroll:${workerId}`);
}
```

### 10B.8. Summary - Architecture Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVERLESS BEST PRACTICES CHECKLIST                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Connection Pooling                                                      │
│     ├── Use Supabase/Neon native pooler (port 6543)                         │
│     ├── Or external PgBouncer with transaction mode                        │
│     └── Set pool_limit based on expected concurrency                       │
│                                                                             │
│  ✅ ACID Transactions                                                       │
│     ├── All multi-table writes use $transaction                           │
│     ├── Use Serializable isolation for financial data                     │
│     └── Set appropriate timeout                                            │
│                                                                             │
│  ✅ Idempotency                                                             │
│     ├── Add idempotency_key header to all POST requests                   │
│     ├── Store keys in database with TTL                                    │
│     └── Return cached response for duplicate requests                      │
│                                                                             │
│  ✅ Concurrency Control                                                     │
│     ├── Use Optimistic Locking for quota-based operations                 │
│     ├── Use Advisory Locks for critical sections                           │
│     └── Handle version conflicts with retry logic                          │
│                                                                             │
│  ✅ Background Processing                                                   │
│     ├── Move heavy operations to message queue (QStash)                   │
│     ├── Process in batches to avoid memory issues                          │
│     ├── Provide job status polling endpoint                                │
│     └── Set appropriate retry strategy                                     │
│                                                                             │
│  ✅ Caching Strategy                                                        │
│     ├── Use ISR for public pages (Job Board)                               │
│     ├── Cache authenticated data in Redis                                 │
│     ├── Invalidate cache on data changes                                  │
│     └── Set appropriate TTL based on data volatility                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. RỦI RO & MITIGATION

### 11.1. Risk Register

| ID | Risk | Impact | Probability | Mitigation |
|----|------|--------|------------|------------|
| R1 | GPS không chính xác trong nhà | High | Medium | Dùng WiFi positioning, fallback accuracy check |
| R2 | OTP SMS delay/blocked | High | Medium | Fallback voice call, retry mechanism |
| R3 | Worker không cung cấp đủ thông tin | Medium | Medium | Profile completion reminders, HR follow-up |
| R4 | Vendor nhập thông tin sai | Medium | High | HR review workflow, validation rules |
| R5 | Máy chấm công offline | High | Medium | SOP điều chỉnh công thủ công |
| R6 | Worker không có smartphone | Medium | Low | Dùng kiosk mode, hoặc hỗ trợ từ HR |
| R7 | Data privacy (CCCD, Bank) | High | Low | AES-256-GCM encryption at rest, GDPR-like compliance |
| R8 | Performance với 10k+ workers | Medium | Medium | Pagination, indexing, caching |

### 11.2. Security Considerations

```typescript
// SECURITY MEASURES

const SECURITY_CONFIG = {
  // Authentication
  otpExpiryMinutes: 5,
  otpMaxAttempts: 3,
  jwtRefreshExpiryDays: 7,
  
  // Rate limiting
  otpRequestPerMinute: 3,
  checkinPerHour: 4,
  loginAttemptsPerMinute: 5,
  
  // Data protection
  cccdImageEncryption: true,
  selfieMinQuality: 0.7,
  gpsAccuracyThreshold: 100, // meters
  
  // Compliance
  dataRetentionDays: 365 * 2, // 2 years for labor law
  auditLogRetention: 365 * 5,  // 5 years
};

// ============================================================
// 11.2.1. ENCRYPTION FOR SENSITIVE DATA
// ============================================================

/*
 * CÁC TRƯỜNG NHẠY CẢM CẦN MÃ HÓA:
 * 
 * 1. cccdNumber - Số CCCD (dùng để xác thực)
 * 2. bankAccount - Số tài khoản ngân hàng
 * 
 * NÊN MÃ HÓA (nếu có thời gian):
 * 3. phone - SĐT (có thể search được nhưng nên bảo vệ)
 * 
 * PHƯƠNG PHÁP MÃ HÓA:
 * - Dùng AES-256-GCM (hoặc Prisma extension)
 * - Mã hóa tại Application Layer trước khi lưu vào DB
 * - Không lưu key mã hóa trong code, dùng env ENCRYPTION_KEY
 */

// Prisma Extension for Encryption (ví dụ)
const encryptionExtension = Prisma.defineExtension({
  name: 'encryptFields',
  query: {
    async $useRawQuery(model, action, args) {
      // Encrypt before write
      // Decrypt after read
    }
  }
});

// ============================================================
// 11.2.2. DATE/TIME HANDLING - CRITICAL FOR EXCEL IMPORT
// ============================================================

/*
 * VIETNAM TIMEZONE: UTC+7 (ICT)
 * 
 * EDGE CASES CẦN XỬ LÝ:
 * 
 * 1. EXCEL IMPORT - Date format thường bị lỗi:
 *    - File từ đối tác: dd/mm/yyyy
 *    - Excel local format: mm/dd/yyyy
 *    - User nhập sai: 31/02/2026 (invalid date)
 * 
 * 2. TIMEZONE HANDLING:
 *    - Server có thể ở timezone khác (UTC)
 *    - User ở Việt Nam (UTC+7)
 *    - Máy chấm công gửi timestamp không có timezone
 * 
 * GIẢI PHÁP:
 * 
 * a) Validation khi import Excel:
 */

function parseVietnamDate(input: string): Date | null {
  // Chuẩn hóa input
  const cleaned = input.trim().replace(/[\/\-\.]/g, '/');
  
  // Thử parse theo format Việt Nam trước (dd/mm/yyyy)
  const vnPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = cleaned.match(vnPattern);
  
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Validate date range
    if (date.getFullYear() >= 1900 && date.getFullYear() <= 2100) {
      // Set timezone về UTC+7
      date.setHours(date.getHours() + 7);
      return date;
    }
  }
  
  return null; // Invalid date
}

/*
 * b) Khi lưu vào database:
 *    - LƯU LUÔN ở UTC (ISO 8601)
 *    - Không lưu timezone trong database
 *    - Frontend hiển thị theo UTC+7
 */

function saveAttendanceToDB(attendance: {
  workerId: string;
  checkinTime: Date;
  source: 'GPS' | 'MACHINE';
}) {
  return prisma.attendance.create({
    data: {
      workerId: attendance.workerId,
      // LƯU ở UTC - set timezone về 0
      checkinTime: new Date(attendance.checkinTime.toISOString()),
      source: attendance.source,
      // Lưu thêm timezone để debug
      timezone: 'Asia/Ho_Chi_Minh',
    }
  });
}
```

---

## 12. TIMELINE & MILESTONES

### 12.1. Phase 1 Timeline (6 tuần)

```
Week 1: Foundation
├── Day 1-2: Project setup, repo structure, CI/CD
├── Day 3-4: Database schema design + Prisma
├── Day 5:   Auth system (OTP, JWT)
└── Day 6-7: RBAC core

Week 2: Core Worker Portal
├── Day 1-2: Worker registration flow
├── Day 3-4: Job Board + Quick Apply
├── Day 5:   Profile management
└── Day 6-7: Worker Classification (3 types + status)

Week 3: Check-in GPS + CTV
├── Day 1-2: Camera + GPS integration
├── Day 3-4: Check-in API + storage
├── Day 5:   GPS history view
└── Day 6-7: CTV Portal core

Week 4: Vendor Portal
├── Day 1-2: Subdomain setup + auth
├── Day 3-4: Project listing + filters
├── Day 5:   Worker input form
└── Day 6-7: Admin review workflow

Week 5: Talent Pool + CRM
├── Day 1-2: Worker CRUD + status lifecycle
├── Day 3-4: Advanced filters + search
├── Day 5:   Client CRUD
└── Day 6-7: Project CRUD + Kanban

Week 6: Integration + Testing
├── Day 1-2: API integration testing
├── Day 3-4: UAT with stakeholders
├── Day 5:   Bug fixes
├── Day 6-7: Documentation + Deployment
```

### 12.2. Milestones

```
M1: Foundation Ready        (End of Week 1)
     ✓ Project setup complete
     ✓ Database schema ready
     ✓ Auth system working

M2: Worker Portal MVP       (End of Week 2)
     ✓ Registration + Classification
     ✓ Job Board + Apply
     ✓ Profile management

M3: Check-in GPS Ready      (End of Week 3)
     ✓ Selfie + GPS working
     ✓ History tracking
     ✓ CTV Portal ready

M4: Vendor Portal Ready     (End of Week 4)
     ✓ Subdomain operational
     ✓ Worker input flow
     ✓ Admin review process

M5: CRM & Talent Ready      (End of Week 5)
     ✓ Project management
     ✓ Talent Pool complete
     ✓ Kanban board

M6: Phase 1 Complete        (End of Week 6)
     ✓ Full system integration
     ✓ UAT passed
     ✓ Production deployment
```

---

## PHỤ LỤC

### A. API Endpoints Summary

| Module | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| Auth | `/api/auth/send-otp` | POST | Gửi OTP SMS |
| Auth | `/api/auth/verify-otp` | POST | Xác minh OTP |
| Auth | `/api/auth/refresh` | POST | Refresh token |
| Worker | `/api/workers` | POST | Tạo worker mới |
| Worker | `/api/workers` | GET | Danh sách workers |
| Worker | `/api/workers/:id` | GET/PUT | Chi tiết/Sửa worker |
| Attendance | `/api/attendance/checkin` | POST | Check-in GPS |
| Attendance | `/api/attendance/history` | GET | Lịch sử chấm công |
| Project | `/api/projects` | CRUD | Quản lý dự án |
| Vendor | `/api/vendors` | CRUD | Quản lý vendor |
| Vendor | `/api/vendors/:id/workers` | POST | Vendor nhập worker |
| CRM | `/api/clients` | CRUD | Quản lý khách hàng |
| CTV | `/api/ctv/referrals` | POST | Nhập referral |

### B. Glossary

| Term | Definition |
|------|------------|
| **HRP** | Human Resources Portal - Nền tảng quản trị nhân sự |
| **B2B** | Business to Business - Doanh nghiệp với doanh nghiệp |
| **B2C** | Business to Consumer - Doanh nghiệp với khách hàng cá nhân |
| **CTV** | Cộng tác viên - Referrer/Recruiter partner |
| **BCC** | Bảng chấm công - Time & Attendance record |
| **T&A** | Time & Attendance - Chấm công |
| **RBAC** | Role-Based Access Control - Phân quyền theo vai trò |
| **OTP** | One-Time Password - Mật khẩu dùng một lần |
| **CCCD** | Căn cước công dân - Vietnamese ID card |
| **ADMS** | Attendance Device Management System - Hệ thống quản lý thiết bị chấm công |
| **VPN** | Vendor - Đối tác cung ứng nhân lực |

---

## 13. LỘ TRÌNH TRIỂN KHAI HẠ TẦNG KỸ THUẬT

> **Định hướng:** Chuyển đổi linh hoạt từ kiến trúc Serverless (phục vụ tốc độ phát triển) sang kiến trúc Cloud Server (phục vụ tính sở hữu và tuân thủ pháp lý).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE MIGRATION ROADMAP                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   GIAI ĐOẠN 1              GIAI ĐOẠN 2              GIAI ĐOẠN 3            │
│   ┌───────────────┐        ┌───────────────┐        ┌───────────────┐      │
│   │   MVP         │        │   PRODUCTION  │        │   OWNERSHIP   │      │
│   │   Vercel Free │   ──▶  │   Vercel Pro  │   ──▶  │   Self-hosted │      │
│   │   Neon Free   │        │   Neon Paid   │        │   VPS Vietnam │      │
│   │   S3          │        │   Connection  │        │   Coolify     │      │
│   │               │        │   Pooling     │        │   On-premise  │      │
│   └───────────────┘        └───────────────┘        │   DB          │      │
│         │                        │                └───────────────┘      │
│         │                        │                        │              │
│         ▼                        ▼                        ▼              │
│   ┌───────────────────────────────────────────────────────────────────┐  │
│   │                    COST: $0                    COST: ~$50-100/mo  │  │
│   └───────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.1. GIAI ĐOẠN 1: THỬ NGHIỆM & PHÁT TRIỂN (MVP)

*Tập trung vào tốc độ ra mắt (Time-to-market), tự động hóa luồng code và tối ưu chi phí.*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GIAI ĐOẠN 1: MVP - THỬ NGHIỆM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         HOSTING: Vercel (Free)                        │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ CI/CD tự động (push to GitHub → auto deploy)           │     │   │
│  │  │  ✓ Preview URL cho mỗi Pull Request                        │     │   │
│  │  │  ✓ Free tier: 100GB bandwidth, 100 serverless functions    │     │   │
│  │  │  ✓ Zero cold start với Edge Network                        │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                         DATABASE: Neon Postgres (Free)               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Serverless PostgreSQL, auto-scale                       │     │   │
│  │  │  ✓ Branching: Tạo nhánh DB để test thuật toán lương     │     │   │
│  │  │  ✓ Free: 0.5GB storage, 1 project, shared compute        │     │   │
│  │  │  ✓ Point-in-time recovery                                  │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                         STORAGE: S3 / Cloudflare R2                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Lưu trữ tạm: Hợp đồng, Ảnh CCCD, Selfie              │     │   │
│  │  │  ✓ S3 Free: 5GB, 20,000 GET, 2,000 PUT                   │     │   │
│  │  │  ✓ R2 Free: 10GB, 100,000 Class A, 1,000,000 Class B      │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                         AUTH: JWT + OTP tự xử lý                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ JWT access token (15 phút) + refresh token (7 ngày)    │     │   │
│  │  │  ✓ OTP SMS qua gateway (Viettel/VNPT)                      │     │   │
│  │  │  ✓ RBAC middleware trong API routes                        │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MỤC TIÊU GIAI ĐOẠN 1:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Kiểm thử mượt mà trên thiết bị di động thật của NLĐ          │   │
│  │  ✅ Đánh giá độ trơn tru của UI/UX                                │   │
│  │  ✅ Chi phí duy trì hệ thống = $0                                │   │
│  │  ✅ Test thuật toán tính lương trên DB branch riêng             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Infrastructure Stack - Giai đoạn 1:**

| Component | Service | Cost | Specs |
|-----------|---------|------|-------|
| Frontend | Vercel Free | $0 | 100GB BW, SSR functions |
| Backend API | Vercel Serverless | $0 | 100 invocations/day |
| Database | Neon Free | $0 | 0.5GB, shared |
| Storage | Cloudflare R2 | $0 | 10GB |
| SMS | Viettel/VNPT | Pay-per-use | ~300-500đ/OTP |

**Environment Variables - Giai đoạn 1:**

```bash
# Database (Neon with connection string)
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/hrp?sslmode=require"

# Storage (Cloudflare R2)
R2_ACCOUNT_ID="xxx"
R2_ACCESS_KEY_ID="xxx"
R2_SECRET_ACCESS_KEY="xxx"
R2_BUCKET="hrp-uploads"

# Auth
JWT_SECRET="xxx"
JWT_REFRESH_SECRET="xxx"

# SMS Gateway
SMS_API_KEY="xxx"
SMS_PROVIDER="viettel"

# Vercel
VERCEL_URL="xxx"
```

---

### 13.2. GIAI ĐOẠN 2: VẬN HÀNH THỰC TẾ (PRODUCTION)

*Đưa hệ thống vào sử dụng cho Khách hàng B2B và quản lý dữ liệu nhân sự thật.*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GIAI ĐOẠN 2: PRODUCTION - VẬN HÀNH THỰC TẾ              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NÂNG CẤP: Vercel Pro ($20/tháng)                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Mở rộng timeout API lên 60s (cho bulk payroll)        │     │   │
│  │  │  ✓ 1000 serverless function invocations/day               │     │   │
│  │  │  ✓ Analytics chi tiết, A/B testing                         │     │   │
│  │  │  ✓ Password protection cho preview deployments            │     │   │
│  │  │  ✓ Support ưu tiên                                         │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                    NÂNG CẤP: Neon (Pay-as-you-go)                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Neon Pro: $25/tháng cho 4GB storage, 1 region           │     │   │
│  │  │  ✓ Auto-pause khi không sử dụng                           │     │   │
│  │  │  ✓ Branching không giới hạn                                │     │   │
│  │  │  ✓ Connection Pooling (bắt buộc)                           │     │   │
│  │  │    → Supavisor: 1000 concurrent connections               │     │   │
│  │  │    → Tránh exhausted connections khi payday               │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                    CẢI TIẾN: Monitoring & Alerting                    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Sentry: Error tracking, performance monitoring         │     │   │
│  │  │  ✓ Vercel Analytics: User behavior, conversion          │     │   │
│  │  │  ✓ Uptime monitoring: UptimeRobot, Pingdom              │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │                    CẢI TIẾN: Security                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │  ✓ Rate limiting: Upstash Rate Limit                      │     │   │
│  │  │  ✓ WAF: Vercel Firewall rules                           │     │   │
│  │  │  ✓ DDoS protection tự động                             │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MỤC TIÊU GIAI ĐOẠN 2:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Hệ thống chịu tải tốt, không nghẽn mạng vào ngày payday      │   │
│  │  ✅ Tích hợp trơn tru với máy chấm công tại xưởng               │   │
│  │  ✅ 1000-5000 concurrent workers truy cập đồng thời              │   │
│  │  ✅ SLA: 99.5% uptime                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Connection Pooling Setup:**

```typescript
// prisma/schema.prisma - Use pooler URL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_POOL_URL") // Use port 6543 (Supavisor)
}

// DATABASE_POOL_URL = postgresql://user:pass@xxx.supabase.co:6543/hrp
```

**Infrastructure Stack - Giai đoạn 2:**

| Component | Service | Cost | Specs |
|-----------|---------|------|-------|
| Frontend | Vercel Pro | $20/mo | Unlimited BW, SSR |
| Backend API | Vercel Pro | Inc. | 1000 req/day |
| Database | Neon Pro | $25/mo | 4GB, Pooler |
| Connection Pooler | Supabase Supavisor | Inc. | 1000 conns |
| Storage | R2 + CDN | $5/mo | 50GB |
| Monitoring | Sentry | $0-26/mo | Free tier OK |
| SMS | Bulk package | ~$20/mo | 10,000 OTPs |

**Tổng chi phí Giai đoạn 2: ~$70-100/tháng**

---

### 13.3. GIAI ĐOẠN 3: SỞ HỮU TOÀN DIỆN & TUÂN THỦ PHÁP LÝ

*Quy hoạch lại hạ tầng nhằm tối ưu chi phí dài hạn và tuân thủ Luật An ninh mạng.*

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                GIAI ĐOẠN 3: OWNERSHIP - TỰ CHỦ HẠ TẦNG                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MIGRATE TO VIETNAM CLOUD                          │   │
│  │                                                                      │   │
│  │    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │    │  Bizfly Cloud    │  │  Viettel IDC    │  │  VNG Cloud      │   │   │
│  │    │  (FPT)          │  │                 │  │                 │   │   │
│  │    │  ✓ Server VPS    │  │  ✓ Server VPS   │  │  ✓ Server VPS   │   │   │
│  │    │  ✓ Managed DB    │  │  ✓ Managed DB   │  │  ✓ Managed DB   │   │   │
│  │    │  ✓ CDN Vietnam   │  │  ✓ CDN Vietnam  │  │  ✓ CDN Vietnam  │   │   │
│  │    └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  │                                                                      │   │
│  │    📋 LÝ DO:                                                         │   │
│  │    • Nghị định 53/2022/NĐ-CP: Dữ liệu cá nhân NLĐ phải lưu        │   │
│  │      trữ tại Việt Nam (CCCD, SĐT, sinh trắc học)                   │   │
│  │    • Luật An ninh mạng 2018: Yêu cầu lưu trữ nội địa               │   │
│  │    • Độ trễ thấp: Ping < 20ms cho user 4G khu công nghiệp         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    COOLIFY - Self-hosted PaaS                        │   │
│  │                                                                      │   │
│  │    Coolify biến VPS thành "Vercel nội bộ":                          │   │
│  │                                                                      │   │
│  │    ┌─────────────────────────────────────────────────────────────┐   │   │
│  │    │                                                             │   │   │
│  │    │    git push ──▶ Coolify ──▶ Auto Deploy                    │   │   │
│  │    │                   │                                         │   │   │
│  │    │                   ├── Build Docker Image                    │   │   │
│  │    │                   ├── SSL Certificate (Let's Encrypt)        │   │   │
│  │    │                   ├── Reverse Proxy (Nginx)                 │   │   │
│  │    │                   └── Database Backup                       │   │   │
│  │    │                                                             │   │   │
│  │    └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │    ✓ Push-to-deploy (như Vercel)                                    │   │
│  │    ✓ Zero-downtime deployment                                       │   │
│  │    ✓ Free, open-source                                              │   │
│  │    ✓ Hỗ trợ Docker, Node.js, PostgreSQL                            │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE MIGRATION                                 │   │
│  │                                                                      │   │
│  │    Neon ──▶ VPS PostgreSQL hoặc Managed DB (Vietnam Cloud)           │   │
│  │                                                                      │   │
│  │    ┌─────────────────────────────────────────────────────────────┐   │   │
│  │    │  1. Export: pg_dump -Fc from Neon                          │   │   │
│  │    │  2. Transfer: Secure file transfer to VPS                   │   │   │
│  │    │  3. Import: pg_restore to new PostgreSQL                    │   │   │
│  │    │  4. Update: DATABASE_URL in Coolify                         │   │   │
│  │    │  5. Verify: Run integration tests                           │   │   │
│  │    │  6. Switch: Point DNS to new server                         │   │   │
│  │    │  7. Monitor: 48h before shutting down Neon                  │   │   │
│  │    └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SECURITY & COMPLIANCE                             │   │
│  │                                                                      │   │
│  │    ┌─────────────────────────────────────────────────────────────┐   │   │
│  │    │  ✓ Mã hóa dữ liệu at-rest (AES-256)                       │   │   │
│  │    │  ✓ Mã hóa truyền tải (TLS 1.3)                            │   │   │
│  │    │  ✓ Backup tự động hàng ngày (异地备份)                    │   │   │
│  │    │  ✓ Firewall: Chỉ mở port 443, 22                          │   │   │
│  │    │  ✓ Audit log cho tất cả truy cập dữ liệu nhạy cảm        │   │   │
│  │    │  ✓ Tuân thủ Nghị định 53/2022/NĐ-CP về Bảo vệ dữ liệu   │   │   │
│  │    └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MỤC TIÊU GIAI ĐOẠN 3:                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Làm chủ 100% dữ liệu và mã nguồn                              │   │
│  │  ✅ Tuân thủ pháp lý Việt Nam (Nghị định 53, Luật ANM)           │   │
│  │  ✅ Ping < 20ms cho user 4G khu công nghiệp                       │   │
│  │  ✅ Chi phí dài hạn tối ưu (không phụ thuộc pricing tier)        │   │
│  │  ✅ Dễ dàng scale up/down dung lượng vật lý                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Infrastructure Stack - Giai đoạn 3:**

| Component | Service | Cost | Specs |
|-----------|---------|------|-------|
| VPS | VNG Cloud / Viettel IDC | $50-100/mo | 4 vCPU, 8GB RAM |
| Managed DB | Vietnam Cloud Provider | Inc. | PostgreSQL 16 |
| CDN | Vietnam CDN | $10/mo | 100GB BW |
| Domain | hrpvietnam.com, hrpvietnam.vn | Đã có | Đã đăng ký |
| SSL | Let's Encrypt (auto) | $0 | Wildcard |
| Coolify | Self-hosted | $0 | VPS included |
| Backup | Object Storage Vietnam | $5/mo | 100GB |
| Monitoring | Grafana + Prometheus | $0 | Self-hosted |

**Tổng chi phí Giai đoạn 3: ~$70-120/tháng (dài hạn)**

---

### 13.4. So sánh Chi phí Dài hạn

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COST COMPARISON (24 MONTHS)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   $2,400 ─┐                                                                │
│           │      ┌──────────────────────────────────────────────┐           │
│   $2,000 ─┤      │                                              │           │
│           │      │         Vercel + Neon (Giai đoạn 2)         │           │
│   $1,600 ─┤      │         $100/tháng x 24 = $2,400           │           │
│           │      │                                              │           │
│   $1,200 ─┤      │         ⚠️ Phụ thuộc pricing tier          │           │
│           │      │         ⚠️ Giới hạn tài nguyên             │           │
│     $800 ─┤      │         ⚠️ Dữ liệu ngoài Việt Nam         │           │
│           │      └──────────────────────────────────────────────┘           │
│     $400 ─┤                                                                │
│           │      ┌──────────────────────────────────────────────┐           │
│       $0 ─┤      │                                              │           │
│           │      │         Self-hosted VPS (Giai đoạn 3)        │           │
│           │      │         $100/tháng x 24 = $2,400 (初期)       │           │
│           │      │                                              │           │
│           │      │         ✓ Làm chủ hoàn toàn                 │           │
│           │      │         ✓ Không giới hạn                    │           │
│           │      │         ✓ Dữ liệu tại Việt Nam             │           │
│           │      │         ✓ Chi phí ổn định dài hạn          │           │
│           │      └──────────────────────────────────────────────┘           │
│           │                                                                │
│           └────────────────────────────────────────────────────────────────  │
│                Giai đoạn 1        Giai đoạn 2        Giai đoạn 3          │
│                 ($0)            ($100/tháng)       ($100/tháng)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.5. Migration Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MIGRATION CHECKLIST: NEON → VPS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRE-MIGRATION (1-2 tuần trước)                                           │
│  ────────────────────────────────────────────────                        │
│  ☐ Backup đầy đủ database từ Neon                                        │
│  ☐ Test restore trên local Docker PostgreSQL                              │
│  ☐ Đánh giá tất cả environment variables                                 │
│  ☐ Cập nhật DNS records (giảm TTL trước 48h)                            │
│  ☐ Thông báo downtime cho users (nếu có)                                 │
│  ☐ Chuẩn bị rollback plan                                                │
│                                                                             │
│  MIGRATION (Ngày migration)                                               │
│  ────────────────────────────────────────────────                        │
│  ☐ Stop writes to Neon (maintenance mode)                                │
│  ☐ Final backup từ Neon                                                 │
│  ☐ Export data: pg_dump -Fc -h Neon -U user dbname > backup.dump       │
│  ☐ Transfer backup.dump to VPS (scp/rsync)                              │
│  ☐ Import: pg_restore -h localhost -U postgres -d hrp backup.dump      │
│  ☐ Verify data integrity (row counts, checksums)                        │
│  ☐ Update DATABASE_URL trong Coolify                                    │
│  ☐ Restart application                                                  │
│  ☐ Test critical flows: login, attendance, payroll                      │
│  ☐ Switch DNS to new VPS IP                                             │
│  ☐ Monitor error rates for 2-4 hours                                   │
│                                                                             │
│  POST-MIGRATION (48-72 giờ sau)                                          │
│  ────────────────────────────────────────────────                        │
│  ☐ Monitor performance (query times, connection counts)                  │
│  ☐ Verify backups are running on new VPS                                │
│  ☐ Test restore procedure                                               │
│  ☐ Keep Neon available (don't delete) for 7 days                        │
│  ☐ Cancel Neon subscription after 1 week                                │
│  ☐ Update documentation with new infrastructure                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## NEXT STEPS

1. **Xác nhận plan** - Review và approve tài liệu này
2. **Kick-off meeting** - Bàn giao cho team development
3. **Setup infrastructure** - Chuẩn bị dev environment
4. **Database design** - Chi tiết schema Prisma
5. **Phase 1 Sprint 1** - Bắt đầu implementation

---

*Document generated: 14/08/2026*
*Version: 1.0*
*Status: Draft*
