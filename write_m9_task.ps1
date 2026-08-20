$content = @"
# TASK: hrp-portal-m9-affiliate-vendor

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m9-affiliate-vendor |
| Work type | CODE |
| Audit mode (Tier 3 doc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | READY_FOR_EXECUTION |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M9-Affiliate-Vendor (Giai doan 3) |
| ADR references | Design System: warm_professionalism |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | /code hrp-portal-m9-affiliate-vendor |
| Updated | 2026-08-20 16:50 +07:00 |

## 1. Outcome

### User-visible outcome

- **CTV (Affiliate):** Khi truy cap \`app/ctv\`, CTV se thay mot Dashboard moi toanh dam chat Gamification: Co bieu do thu nhap hoa hong, lich su claim ro rang, va nut "Yeu cau rut tien" (Withdrawal Request).
- **Vendor:** Khi truy cap \`app/vendor\`, nha cung ung se thay giao dien Dong bo voi Design System hien tai. Khung Doi soat cong no (Statements) duoc thiet ke truc quan, hien thi chi tiet cac khoan no va trang thai thanh toan.

### Non-goals

- Khong lam chuc nang thanh toan that (Payment Gateway). Viec rut tien chi dung lai o viec tao Ban ghi (Record) "Cho duyet".
- Khong dung vao luong cham cong cua Worker hay Admin.

## 2. Evidence and Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Audit Report (M2 goc) | Route \`/ctv\` dang dung UI cu tu Phase 1, chua co bieu do thu nhap va Gamification. | Phai thiet ke lai UI cho CTV Dashboard, bo sung bieu do. |
| EV-02 | Audit Report (M6 goc) | Route \`/vendor\` cung dung UI cu, chua tich hop luong Statement chuan. | Dong bo giao dien Vendor Portal. |

## 3. Decisions and Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Su dung thu vien Chart hien co (Recharts hoac Chart.js) de ve bieu do thu nhap cho CTV. | Planner | Valid |
| DEC-02 | CHOSEN | Giao dien doi soat cua Vendor chi hien thi du lieu mau (Mock) neu API that chua san sang. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | **Affiliate UI:** Thiet ke lai \`app/ctv/page.tsx\` thanh Dashboard moi (co Bieu do thu nhap, Gamification). | Must | EV-01 | UI xau. |
| RQ-02 | **Withdrawal Request:** Tao nut va luong "Yeu cau rut tien" cho CTV. | Must | EV-01 | Khong rut duoc tien. |
| RQ-03 | **Vendor UI:** Dong bo giao dien \`app/vendor/page.tsx\` theo chuan chung. | Must | EV-02 | Khong khop Design. |
| RQ-04 | **Vendor Statements:** Hoan thien module Doi soat cong no o Vendor Portal. | Must | EV-02 | Thieu nghiep vu. |
| RQ-05 | Pass toan bo test suite va build Next.js thanh cong. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- \`app/ctv/*\`
- \`app/vendor/*\`
- Components bieu do (Charts) trong \`src/components\` (neu can tao moi).

**Out of scope:**
- Payment gateway thuc te.
- \`app/admin\` va \`app/worker\`.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | CTV Dashboard | Code lai giao dien tong quan cho CTV, kem Chart. | N/A | Check UI | Syntax Error |
| STEP-02 | RQ-02 | CTV Withdraw | Them Modal/Form de CTV tao yeu cau rut tien. | STEP-01 | Check Modal | 500 Error |
| STEP-03 | RQ-03 | Vendor UI | Code lai UI trang chu Vendor. | N/A | Check UI | Syntax Error |
| STEP-04 | RQ-04 | Vendor Statements | Hien thi danh sach ky doi soat cong no. | STEP-03 | Check UI | 500 Error |
| STEP-05 | RQ-05 | Quality | Chay vitest va build. | STEP-04 | Exit 0 | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01, RQ-02 | CTV vao duoc Dashboard moi, bieu do hien thi duoc data, an nut Rut tien thanh cong. | Truyc cap \`/ctv\` | Anh chup | Yes |
| AC-02 | RQ-03, RQ-04 | Vendor vao duoc portal, xem duoc danh sach Doi soat (Statements) nhat quan. | Truy cap \`/vendor\` | Anh chup | Yes |
| AC-03 | RQ-05 | \`npm run build\` thanh cong. | Chay lenh | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01, RQ-02 | STEP-01, STEP-02 | AC-01 |
| RQ-03, RQ-04 | STEP-03, STEP-04 | AC-02 |
| RQ-05        | STEP-05          | AC-03 |

## 7. Risk and Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Thu vien Chart lam phinh to bundle size qua muc. | Build failed hoac cham. | Dung lazy loading (dynamic import) cho Chart component. | Go bo Chart |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| - | - | - | - | - |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tao task hrp-portal-m9-affiliate-vendor. | Giai doan 3 (M2 & M6 goc). |
"@

Set-Content docs/tasks/hrp-portal-m9-affiliate-vendor/TASK.md -Value $content -Encoding UTF8
