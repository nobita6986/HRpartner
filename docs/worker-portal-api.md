# Worker Portal API — Decoupled JSON Responses

> **Triết lý:** Worker Portal chỉ phục vụ 3 use case cốt lõi:
> 1. **Xem ca làm** (shift hôm nay + tuần này)
> 2. **Xem phiếu lương** (tổng thu nhập tháng này + lịch sử 3 tháng)
> 3. **Đọc thông báo** (từ HR — quan trọng, đọc trước)
>
> **KHÔNG expose:** dữ liệu khách hàng, hợp đồng nội bộ, lương vendor, rate card, ticket nội bộ, audit log.
>
> Reference UX: [viec3mien.vn](https://viec3mien.vn/) — việc làm 3 miền, font lớn, contrast cao, layout đơn giản cho người lao động phổ thông.

## Design Principles

| Nguyên tắc | Giải thích |
|-------------|------------|
| **Minimal fields** | Mỗi response ≤ 10 fields ở top level. Worker không cần biết `clientCompanyId`, `vendorRate`, `billingTerms`. |
| **Pre-formatted strings** | API trả `displayShift: "Ca sáng 7h-16h"` thay vì `shiftStart: "07:00:00"`, `shiftEnd: "16:00:00"`. Worker không tính toán. |
| **Local time** | Tất cả datetime đã convert sang `Asia/Ho_Chi_Minh` + format `vi-VN`. Worker không cần xử lý timezone. |
| **BigInt → number string** | Money là string `2.000.000` (đã format VND), KHÔNG phải raw number. Worker không cần thêm dấu phân cách. |
| **Status icon** | Trả `statusIcon: "🟢"` / `🔴` / `🟡` thay vì enum. Worker không đọc được enum. |
| **No nested objects > 1 level** | Worker UI không hiển thị detail nhiều cấp. Flat structure. |
| **Vietnamese first** | Mọi string user-facing tiếng Việt. Key tiếng Anh để dễ dev. |

## Endpoints

### 1. `GET /api/m/home`

**Mục đích:** Lấy "hôm nay của tôi" — tất cả thông tin worker cần trong 1 call.

**Response 200:**

```json
{
  "worker": {
    "name": "Nguyễn Văn An",
    "avatar": null,
    "firstLogin": false
  },
  "today": {
    "date": "Thứ Sáu, 14/08/2026",
    "shift": {
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình, Q.7, TP.HCM",
      "project": "Đóng gói hàng hóa KCN Tân Bình",
      "status": "Đang làm việc",
      "statusIcon": "🟢",
      "checkInTime": "07:05",
      "expectedCheckout": "16:00"
    },
    "noShiftToday": false,
    "nextShift": {
      "date": "Thứ Bảy, 15/08/2026",
      "timeRange": "07:00 – 16:00"
    }
  },
  "thisMonth": {
    "workedDays": 11,
    "totalDays": 14,
    "estimatedPay": "5.280.000 đ",
    "month": "Tháng 8/2026"
  },
  "unreadNotifications": 2,
  "pendingTickets": 1,
  "quickActions": [
    { "id": "viewShift", "label": "Xem ca tuần này", "icon": "📅" },
    { "id": "viewPayslip", "label": "Phiếu lương tháng 8", "icon": "💰" },
    { "id": "viewTickets", "label": "Đơn của tôi (1 chờ)", "icon": "📝" }
  ]
}
```

**Ẩn khỏi worker:** `clientCompanyId`, `vendorId`, `agreedRateVnd`, `agreedMultiplier`, `assignedAt`, `projectCode`.

---

### 2. `GET /api/m/shifts?week=2026-08-10`

**Mục đích:** Lịch làm việc 1 tuần (worker cần biết đi làm khi nào, ở đâu).

**Response 200:**

```json
{
  "weekRange": "10/08 – 16/08/2026",
  "shifts": [
    {
      "date": "Thứ Hai, 10/08",
      "dateIso": "2026-08-10",
      "hasShift": true,
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình",
      "project": "Đóng gói hàng",
      "status": "Đã chấm công",
      "statusIcon": "✅",
      "checkIn": "07:05",
      "checkOut": "16:10",
      "hoursWorked": "8h 5ph"
    },
    {
      "date": "Thứ Ba, 11/08",
      "hasShift": true,
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình",
      "project": "Đóng gói hàng",
      "status": "Đã chấm công",
      "statusIcon": "✅",
      "checkIn": "07:00",
      "checkOut": "16:00",
      "hoursWorked": "8h"
    },
    {
      "date": "Thứ Tư, 12/08",
      "hasShift": true,
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình",
      "project": "Đóng gói hàng",
      "status": "Đang làm việc",
      "statusIcon": "🟢",
      "checkIn": "06:58",
      "expectedCheckout": "16:00"
    },
    {
      "date": "Thứ Năm, 13/08",
      "hasShift": true,
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình",
      "project": "Đóng gói hàng",
      "status": "Vắng – chưa chấm công",
      "statusIcon": "🔴",
      "checkIn": null,
      "checkOut": null,
      "note": "Bạn chưa chấm công ngày này. Liên hệ PM nếu có lý do."
    },
    {
      "date": "Thứ Sáu, 14/08",
      "hasShift": true,
      "title": "Ca sáng",
      "timeRange": "07:00 – 16:00",
      "location": "KCN Tân Bình",
      "project": "Đóng gói hàng",
      "status": "Hôm nay",
      "statusIcon": "🟢",
      "checkIn": "07:05",
      "expectedCheckout": "16:00",
      "isToday": true
    },
    {
      "date": "Thứ Bảy, 15/08",
      "hasShift": false,
      "title": "Nghỉ",
      "note": null
    },
    {
      "date": "Chủ Nhật, 16/08",
      "hasShift": false,
      "title": "Nghỉ",
      "note": null
    }
  ],
  "summary": {
    "daysWorked": 3,
    "daysRemaining": 2,
    "totalHoursThisWeek": "24h 5ph"
  }
}
```

---

### 3. `GET /api/m/payslips?year=2026&month=8`

**Mục đích:** Phiếu lương tháng — worker cần biết "tháng này tôi nhận bao nhiêu".

**Response 200:**

```json
{
  "payslip": {
    "month": "Tháng 8/2026",
    "periodStart": "01/08/2026",
    "periodEnd": "14/08/2026",
    "isFinalized": false,
    "status": "Tạm tính",
    "statusIcon": "🟡",
    "earnings": [
      { "label": "Lương chính (11 ngày × 8h)", "amount": "4.840.000 đ" },
      { "label": "Phụ cấp cơm", "amount": "440.000 đ" }
    ],
    "totalEarnings": "5.280.000 đ",
    "deductions": [],
    "totalDeductions": "0 đ",
    "netPay": "5.280.000 đ",
    "netPayIcon": "💰",
    "note": "Chưa phải lương chính thức. Lương chốt vào ngày 5 hàng tháng.",
    "history": [
      {
        "month": "Tháng 7/2026",
        "netPay": "5.120.000 đ",
        "paidAt": "05/08/2026",
        "status": "Đã trả",
        "statusIcon": "✅"
      },
      {
        "month": "Tháng 6/2026",
        "netPay": "4.960.000 đ",
        "paidAt": "05/07/2026",
        "status": "Đã trả",
        "statusIcon": "✅"
      }
    ]
  }
}
```

**Ẩn khỏi worker:** `bhxhAmount`, `bhytAmount`, `bhtnAmount`, `pitAmount`, `taxableIncome`, `taxBracket`, `payRunId`, `payRunCode`, `vendorPayRate`, `clientBillRate`.

> **Lưu ý quan trọng:** Worker chỉ thấy **net pay**. BHXH/BHYT/BHTN/PIT đã trừ ở admin; worker không cần biết chi tiết vì có thể gây hiểu lầm (lao động phổ thông không đọc được payroll breakdown).

---

### 4. `GET /api/m/notifications?unread=true`

**Mục đích:** Thông báo quan trọng từ HR (tăng ca, đổi ca, nhận lương, ticket resolved).

**Response 200:**

```json
{
  "unreadCount": 2,
  "notifications": [
    {
      "id": "n-001",
      "title": "💰 Đã trả lương tháng 7",
      "body": "Bạn đã nhận 5.120.000 đ vào tài khoản VCB ***5678 ngày 05/08.",
      "icon": "💰",
      "createdAt": "2 ngày trước",
      "isUnread": true,
      "actionLabel": "Xem phiếu lương",
      "actionTarget": "/m/payslips?month=7"
    },
    {
      "id": "n-002",
      "title": "⏰ Đổi ca ngày mai",
      "body": "Ca sáng 14/08 đổi thành ca chiều 13h-22h. Vui lòng xác nhận.",
      "icon": "⏰",
      "createdAt": "3 giờ trước",
      "isUnread": true,
      "actionLabel": "Xem lịch tuần",
      "actionTarget": "/m/shifts"
    },
    {
      "id": "n-003",
      "title": "✅ Đơn xin nghỉ đã duyệt",
      "body": "Đơn nghỉ phép ngày 20/08 đã được HR duyệt.",
      "icon": "✅",
      "createdAt": "1 tuần trước",
      "isUnread": false,
      "actionLabel": "Xem đơn",
      "actionTarget": "/m/tickets"
    }
  ]
}
```

**Ẩn khỏi worker:** `actorId`, `actorRole`, `channel`, `retryCount`, `failureReason`, `scheduledAt`, `sentAt`.

---

### 5. `POST /api/m/notifications/{id}/read`

**Mục đích:** Worker đánh dấu đã đọc. Response rỗng 204.

---

### 6. `GET /api/m/tickets`

**Mục đích:** Worker xem các đơn của mình (xin nghỉ, tạm ứng, phản ánh công).

**Response 200:**

```json
{
  "tickets": [
    {
      "id": "tk-001",
      "type": "Xin nghỉ phép",
      "typeIcon": "📅",
      "title": "Nghỉ phép ngày 20/08",
      "status": "Đã duyệt",
      "statusIcon": "✅",
      "createdAt": "3 ngày trước"
    },
    {
      "id": "tk-002",
      "type": "Tạm ứng lương",
      "typeIcon": "💵",
      "title": "Tạm ứng 2.000.000 đ",
      "status": "Chờ HR duyệt",
      "statusIcon": "⏳",
      "createdAt": "1 ngày trước"
    }
  ]
}
```

**Ẩn khỏi worker:** `workerId`, `reviewerId`, `reviewerRole`, `version`, `fromStatus`, `toStatus`, `note` (nội bộ HR), `metadata` (IP, user-agent).

---

### 7. `GET /api/m/profile`

**Mục đích:** Worker xem hồ sơ cá nhân (CCCD, ngân hàng, MST).

**Response 200:**

```json
{
  "profile": {
    "fullName": "Nguyễn Văn An",
    "employeeCode": "EMP-001",
    "phone": "0901 234 567",
    "dateOfBirth": "15/05/1985",
    "gender": "Nam",
    "nationalId": "079XXXXXXXXX",
    "taxCode": "8XXXXXX9",
    "bankAccount": {
      "bankName": "Vietcombank",
      "accountMasked": "****5678",
      "accountHolder": "NGUYEN VAN AN"
    },
    "address": "123 Lê Lợi, Q.1, TP.HCM",
    "profileComplete": true,
    "lastUpdated": "01/08/2026"
  }
}
```

**Ẩn khỏi worker:** `bankAccount` (full), `cccdChipData`, `cccdIssuedPlace`, `internalNotes`, `riskStatus`, `sourceClaims`.

---

## Decoupled API Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 15 (App Router)                    │
│                                                                │
│  ┌─────────────────────┐         ┌────────────────────────┐    │
│  │  /admin/* (RSC)     │         │  /m/* (RSC + PWA)      │    │
│  │  - HR dashboard     │         │  - Worker mobile-first │    │
│  │  - PM tracking      │         │  - viec3mien.vn style  │    │
│  │  - Accountant       │         │  - large fonts 18px+   │    │
│  │  - Vendor portal    │         │  - high contrast       │    │
│  └──────────┬──────────┘         └──────────┬─────────────┘    │
│             │                              │                   │
│             │  fetch()                     │  fetch()           │
│             ▼                              ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              /api/admin/* (RBAC: HR/PM/ACCOUNTANT)     │   │
│  │              /api/m/*      (RBAC: WORKER only)          │   │
│  │              /api/vendor/* (RBAC: VENDOR/CTV only)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Domain Services (server-side, RBAC enforced)           │   │
│  │  - ticket.service.ts                                    │   │
│  │  - workerProfile.service.ts                             │   │
│  │  - timesheet.service.ts                                 │   │
│  │  - payslip.service.ts                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                   │
│                            ▼                                   │
│                    PostgreSQL (Neon) + R2 + QStash             │
└────────────────────────────────────────────────────────────────┘
```

**3 khác biệt chính giữa Admin API và Worker API:**

| Aspect | Admin API (`/api/admin/*`) | Worker API (`/api/m/*`) |
|--------|---------------------------|-------------------------|
| **Auth** | Session JWT (full claims) | Session JWT (workerId only, no roles) |
| **Rate limit** | 60 req/min | 30 req/min (mobile data) |
| **Response format** | Full entities (relations included) | Flat + pre-formatted strings |
| **List pagination** | Cursor + offset | Skip only (max 50) |
| **Error format** | `{ error, message, details }` | `{ message: "Đăng nhập lại", code: "AUTH_EXPIRED" }` (no stack trace) |
| **Caching** | No cache (always fresh) | ETag + 5-min cache for `home` endpoint |

## Security Boundaries

```typescript
// src/shared/middleware/workerOnly.ts
export function workerOnly(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'WORKER') {
    throw new ForbiddenError('Worker only');
  }

  // HARD CHECK: every query MUST filter by workerId
  // No way to query another worker's data
  return { ...session, scopeWorkerId: session.id };
}

// Example: shift query
const shifts = await prisma.timesheetLine.findMany({
  where: {
    assignment: { workerId: session.scopeWorkerId },  // ← enforced
    workDate: { gte: weekStart, lte: weekEnd },
  },
});
```

## Field-Level Filtering Pattern

```typescript
// src/shared/serializers/workerPayslip.ts

export function serializePayslipForWorker(payResult: WorkerPayResult): WorkerPayslipDTO {
  return {
    month: formatMonth(payResult.period.month, payResult.period.year),
    periodStart: formatDate(payResult.period.startDate),
    periodEnd: formatDate(payResult.period.endDate),
    isFinalized: payResult.status === 'PAID',
    status: payResult.status === 'PAID' ? 'Đã trả' : 'Tạm tính',
    statusIcon: payResult.status === 'PAID' ? '✅' : '🟡',
    earnings: [
      {
        label: `Lương chính (${payResult.workedDays} ngày × ${payResult.standardHoursPerDay}h)`,
        amount: formatVnd(payResult.grossSalary),  // ← đã trừ BHXH
      },
      ...payResult.allowances.map(a => ({
        label: a.name,
        amount: formatVnd(a.amount),
      })),
    ],
    totalEarnings: formatVnd(payResult.netSalary),  // ← net, không gross
    deductions: [],  // ← LUÔN RỖNG cho worker (compliance: BHXH đã trừ ở gross)
    totalDeductions: '0 đ',
    netPay: formatVnd(payResult.netSalary),
    netPayIcon: '💰',
    note: payResult.status === 'PAID'
      ? `Đã trả vào ${formatDate(payResult.paidAt)}.`
      : 'Chưa phải lương chính thức. Lương chốt vào ngày 5 hàng tháng.',
  };

  // ⚠️ EXPLICITLY NOT INCLUDED:
  // - bhxhAmount, bhytAmount, bhtnAmount (luôn trừ vào gross)
  // - pitAmount, taxableIncome, taxBracket (PIT — worker VN không tính)
  // - vendorPayRate, clientBillRate (chỉ admin xem)
  // - payRunId, payRunCode (admin-only)
}
```

## DoD Worker Portal API

- [x] 7 endpoints (`/home`, `/shifts`, `/payslips`, `/notifications`, `/notifications/{id}/read`, `/tickets`, `/profile`)
- [x] Mỗi response flat structure, ≤ 10 fields top-level, tiếng Việt
- [x] Field-level filtering (ẩn BHXH/PIT/rate nội bộ)
- [x] Worker scope enforced (middleware `workerOnly`)
- [x] Status icon + pre-formatted strings (worker không cần tính)
- [x] Money format VND (`5.280.000 đ`)
- [x] Date format `vi-VN` (timezone VN)
- [x] Rate limit riêng cho mobile
- [x] Serializer pattern (`serializePayslipForWorker`)
- [ ] Implement thực tế: chờ Wave 3 (Worker Portal release)