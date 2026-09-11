# TASK — `hrp-v6-ui-04h-width-uniform`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04h-width-uniform` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure layout width fix; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `0bdc2b7` (UI04f sticky bottom fix) |
| In-scope roots | `areas-section.tsx`, `recruiting-projects-section.tsx`, `referral-strip.tsx`, `GlobalFooter.tsx` |
| Forbidden paths | Other components |
| Required gates | `npm run typecheck` exit 0, Vercel visual review |

## 1. Outcome

### 1.1 Owner directive

11/09/2026 08:37 UTC+7: "em sửa sai rồi, bây giờ thì trên UI có tới 3 kích thước chiều rộng, hãy đồng nhất kích thước từ phần hero tới best job, tới việc làm theo khu vực... tới footer. Lấy kích thước chuẩn theo Hero nhé"

### 1.2 User-visible outcome

Sau push, **tất cả sections trên portal** có cùng max-width = `max-w-7xl` (1280px):

| Section | Before | After |
|---|---|---|
| Hero | `max-w-7xl` | ✅ `max-w-7xl` (không đổi) |
| SearchSection | `max-w-7xl` | ✅ `max-w-7xl` (không đổi) |
| BestJobs | `max-w-7xl` | ✅ `max-w-7xl` (không đổi) |
| AreasSection | `max-w-[1080px]` | → `max-w-7xl` |
| RecruitingProjects | `max-w-[1080px]` | → `max-w-7xl` |
| ReferralStrip | `max-w-[1080px]` | → `max-w-7xl` |
| GlobalFooter | `max-w-[1080px]` | → `max-w-7xl` |

### 1.3 Implementation

**areas-section.tsx**: `max-w-[1080px]` → `max-w-7xl`
**recruiting-projects-section.tsx**: `max-w-[1080px]` → `max-w-7xl`
**referral-strip.tsx**: `max-w-[1080px]` → `max-w-7xl`
**GlobalFooter.tsx**: `max-w-[1080px]` → `max-w-7xl`

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 08:37 | "có tới 3 kích thước chiều rộng" |
| `EV-02` | Screenshot owner | 3 width khác nhau trên UI |
| `EV-03` | Hero dùng `max-w-7xl` | Chuẩn width owner yêu cầu |
| `EV-04` | 3 sections + Footer dùng `max-w-[1080px]` | Root cause width lệch |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Chuẩn = `max-w-7xl` (1280px) theo Hero | `OWNER_DECIDED` |
| `DEC-02` | 4 files: areas-section + recruiting-projects + referral-strip + GlobalFooter | `TIER_1_DECIDED` (owner liệt kê) |
| `DEC-03` | Commit + push `main` | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Hero = `max-w-7xl` (baseline, không đổi) |
| `RQ-02` | AreasSection = `max-w-7xl` |
| `RQ-03` | RecruitingProjects = `max-w-7xl` |
| `RQ-04` | ReferralStrip = `max-w-7xl` |
| `RQ-05` | GlobalFooter = `max-w-7xl` |
| `RQ-06` | `npm run typecheck` exit 0 |

### 4.2 Non-goals

- KHÔNG đổi Hero, SearchSection, BestJobs (đã đúng chuẩn)
- KHÔNG đổi layout grid bên trong sections
- KHÔNG đổi padding/margin

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | 4 files | Thay `max-w-[1080px]` → `max-w-7xl` | grep |
| `STEP-02` | Local | `npm run typecheck` | exit 0 |
| `STEP-03` | Git | Commit + push `main` | Vercel trigger |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | Tất cả 7 sections (hero/search/bestjobs/areas/recruiting/referral/footer) = `max-w-7xl` | `grep max-w-7xl` + Vercel preview |
| `AC-02` | KHÔNG còn `max-w-[1080px]` trong layout containers | `grep max-w-\[1080px\]` |
| `AC-03` | `npm run typecheck` exit 0 | shell |

## 7. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | Đồng nhất width tất cả sections = max-w-7xl |
