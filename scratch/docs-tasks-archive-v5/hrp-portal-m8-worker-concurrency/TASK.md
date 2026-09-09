# TASK: hrp-portal-m8-worker-concurrency

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m8-worker-concurrency |
| Work type | CODE |
| Audit mode (Tier 3 doc) | CODE_AUDIT |
| Spec version | v1.0 |
| Status | ACCEPTED |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 |
| Auditor | Tier 3 |
| Baseline | HEAD of main |
| Modules | M8-Worker-Concurrency (M3 goc) |
| ADR references | Architecture: High Concurrency & Redis |
| Current execution round | 1 |
| Current audit round | 0 |
| Next gate | DONE |
| Updated | 2026-08-20 16:45 +07:00 |

## 1. Outcome

### User-visible outcome

- **Cong nhan (Worker):** Khi truy cap `app/worker` (cham cong, xem luong) vao ngay cao diem (mung 5 hang thang), neu he thong dang qua tai, ho se duoc dua vao "Phong cho ao" (Virtual Waiting Room) voi thong bao than thien thay vi thay loi sap trang (500/502).
- **Giao dien:** Nang cap trang chu danh cho Cong nhan (`app/worker`) hien thi cac the thong tin luong, cham cong muot ma, bam theo chuan UI Design System hien tai.

### Non-goals

- Khong lap trinh script Python (`appBCC`) de tinh toan luong. Viec nay dang duoc mot Agent khac xu ly doc lap.
- Khong thay doi nghiep vu tinh luong cot loi. Chung ta chi tap trung vao co so ha tang chiu tai (Caching & Rate Limiting).

## 2. Evidence

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | Audit Report | He thong hien tai co nguy co sap neu 10.000 cong nhan truy cap cung luc. | Phai dung Rate Limiting va Redis Cache. |
| EV-02 | Yeu cau Sep | Python app dang lam o agent khac, du lieu day qua se dung Mock. | Tao ra co che nhan payload va luu vao Redis, dung du lieu gia de test. |

## 3. Decisions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Su dung `@upstash/redis` hoac `redis`. Luu cau hinh Rate Limiting vao `middleware.ts`. | Planner | Valid |
| DEC-02 | CHOSEN | Dinh nghia mot cau truc JSON Mock Payload gia dinh ma app Python se day qua, luu truc tiep vao cache de UI doc nhanh nhat. | Planner | Valid |
| DEC-03 | CHOSEN | Giao dien Worker (`/worker/page.tsx`) se goi API lay data tu Redis Cache truoc, neu miss moi query DB. | Planner | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | **Redis Setup:** Ket noi Redis. Viet service/helper de Get/Set cache. | Must | EV-01 | Cache Miss. |
| RQ-02 | **Rate Limiting (Waiting Room):** Bo sung logic Rate Limit vao `middleware.ts` cho route `/worker*`. | Must | EV-01 | Sap server. |
| RQ-03 | **Mock Pre-compute Payslip:** Tao API endpoint hoac seed script de nap du lieu luong gia vao Redis. | Must | EV-02 | UI khong co data. |
| RQ-04 | **Worker UI:** Nang cap `app/worker/page.tsx`, uu tien doc du lieu tu Redis de hien thi. | Must | UX | Loi UI. |
| RQ-05 | Pass toan bo test suite va build Next.js thanh cong. | Must | Baseline | CI fail. |

### 4.2 Scope boundaries

**In scope:**
- `middleware.ts`
- `src/lib/redis.ts`
- `app/api/webhook/payslip/route.ts`
- `app/worker/page.tsx`

**Out of scope:**
- Dong co tinh luong that su.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01 | Redis Config | Cau hinh thu vien ket noi Redis. | N/A | Check code | Syntax Error |
| STEP-02 | RQ-02 | Rate Limit | Cai dat Virtual Waiting Room o `middleware.ts`. | STEP-01 | Load test | Sap request |
| STEP-03 | RQ-03 | Mock Data | Viet API webhook nhan JSON va seed data mau vao Redis. | STEP-01 | API | Khong luu cache |
| STEP-04 | RQ-04 | Worker UI | Nang cap UI `/worker`, doc data tu Redis hien thi. | STEP-03 | Check UI | 404 / 500 |
| STEP-05 | RQ-05 | Quality | Chay vitest va build. | STEP-04 | Exit 0 | Build Fail |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01, RQ-02 | Khi request lien tuc vao `/worker`, kick hoat Waiting Room. | Script spam request | Log request | Yes |
| AC-02 | RQ-03, RQ-04 | Giao dien Worker hien thi dung du lieu lay tu Redis thay vi DB. | Kiem tra Network/Log | Anh chup | Yes |
| AC-03 | RQ-05 | `npm run build` thanh cong. | Chay lenh | Exit 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 | AC-01 |
| RQ-02 | STEP-02 | AC-01 |
| RQ-03 | STEP-03 | AC-02 |
| RQ-04 | STEP-04 | AC-02 |
| RQ-05 | STEP-05 | AC-03 |

## 7. Risk

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Xung dot `middleware.ts` voi Auth. | Sua sai logic bao mat. | Test ky auth token truoc khi chay Rate Limit. | Restore |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| - | - | - | - | - |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | AUD-001 | ACCEPT | In-memory cache is acceptable for dev as long as the interface matches Redis | None | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tao task hrp-portal-m8-worker-concurrency. | M3 goc - Kien truc chiu tai. |
| 1.1 | 2026-08-20 | Đóng task (ACCEPTED). | Audit báo PASS vòng 1. |

