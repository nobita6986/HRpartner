# TASK — `hrp-v6-ui-04c1-r5-footer-spacing-fix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r5-footer-spacing-fix` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual spacing revert trong scope footer component; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md mới)` |
| Baseline | `0e866ca` (R4 push) |
| In-scope roots | `app/components/GlobalFooter.tsx` |
| Forbidden paths | `app/api/**`, `app/(portal)/**`, `app/admin/**`, `app/api/admin/**`, `prisma/**`, `docs/V7/**` |
| Required gates | `npm run typecheck` exit 0, Vercel preview visual review |
| Current execution round | `R5` |
| Previous round | `R4` (commit `0e866ca` — bị Owner reject: spacing giãn quá xa do `justify-between` + `gap-0`) |
| Next gate | `OWNER_VISUAL_REVIEW` (anh xem preview Vercel sau khi push) |

## 1. Outcome

### 1.1 User-visible outcome

Footer ở https://hrpvietnam.com/ (sau push lên main) hiển thị:

1. **Cột 1 (Công ty)**: vẫn KHÔNG có dòng "HRP Co.,Ltd" (giữ R4 fix). Spacing giữa các dòng thoáng tự nhiên (≈12px giữa info blocks + ≈8px giữa contact items), KHÔNG giãn quá xa như R4.
2. **Cột 2 (Dịch vụ)**: 5 services items cách nhau khoảng thoáng tự nhiên (≈12px), không giãn, không sát.
3. **Cột 3 (Liên hệ)**: giữ nguyên ContactForm panel.

### 1.2 Non-goals

- KHÔNG đổi cấu trúc 3-cột grid.
- KHÔNG đổi ContactForm, FooterRouteLink, FooterDisabledText.
- KHÔNG đổi copyright bottom bar.
- KHÔNG đổi icon cho services list.
- KHÔNG quay lại `gap-3` cũ (R3 spacing đã bị Owner complain "giãn"); KHÔNG dùng `justify-between` (R4 spacing cũng đã bị Owner complain "giãn quá xa").

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 01:04 UTC+7: "footer mày càng sửa càng sai, ở cột CÔNG TY TNHH HRP VIỆT NAM, các dòng bị cách nhau quá xa" | R4 reject — `justify-between` + `gap-0` đẩy items giãn top↔bottom |
| `EV-02` | Screenshot 11/09/2026 01:04 (Owner cung cấp) | Visual confirmation R4 spacing quá giãn ở cột 1 |
| `EV-03` | Commit `0e866ca` (R4) | Điểm xuất phát cho R5 revert |
| `EV-04` | `tier1.md` audit selection: FAST = NONE mặc định | Không cần Tier 3 audit cho R5 spacing revert |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Revert `justify-between` + `gap-0` → `gap-y-3` (cột 1 wrapper + cột 2 wrapper + services list) + `gap-y-2` (contact items block) | `OWNER_DECIDED` (theo EV-01 feedback) |
| `DEC-02` | Giữ R4 fix: KHÔNG có dòng "HRP Co.,Ltd" | `OWNER_DECIDED` (giữ nguyên R4 outcome) |
| `DEC-03` | Dùng `gap-y-N` (vertical-only) thay vì `gap-N` (both axes) vì column flex layout chỉ stack dọc | `TIER_1_DECIDED` (kỹ thuật) |
| `DEC-04` | Commit + push thẳng lên `main` (anh đã ủy quyền Tier 1 push production trong TIER0_UI04 directive trước đó) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Footer KHÔNG còn dòng text "HRP Co.,Ltd" (giữ R4 fix) |
| `RQ-02` | Cột 1 wrapper class: `flex flex-col gap-y-3` (≈12px giữa các info blocks) |
| `RQ-03` | Contact items block (4 items: 2 hotline + email + website): `flex flex-col gap-y-2` (≈8px) |
| `RQ-04` | Cột 2 wrapper class: `flex flex-col gap-y-3` (≈12px) |
| `RQ-05` | Services list (5 items): `flex list-none flex-col gap-y-3` (≈12px — đọc thoáng hơn vì text wrap dài) |
| `RQ-06` | 3-cột grid (`md:grid-cols-[1.1fr_1fr_1.1fr]`) giữ nguyên |
| `RQ-07` | `npm run typecheck` exit 0 |
| `RQ-08` | Diff scope chỉ trong `app/components/GlobalFooter.tsx` |
| `RQ-09` | Visual: cột 1 + cột 2 spacing thoáng tự nhiên, KHÔNG giãn (so với R4), KHÔNG sát (so với R3) |

### 4.2 Scope boundaries

- **In:** `app/components/GlobalFooter.tsx` (chỉ revert 4 className wrapper, không xóa/thêm text node)
- **Out:** Tất cả component khác; ContactForm internal; bottom copyright bar; 3-cột grid template

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | Line 59 (cột 1 wrapper) | `justify-between gap-0` → `gap-y-3` | grep | — |
| `STEP-02` | Line 70 (contact items block) | `justify-between gap-0` → `gap-y-2` | grep | — |
| `STEP-03` | Line 100 (cột 2 wrapper) | `justify-between gap-0` → `gap-y-3` | grep | — |
| `STEP-04` | Line 102 (services list) | `justify-between gap-0` → `gap-y-3` | grep | — |
| `STEP-05` | Local | Chạy `npm run typecheck` | exit 0 | Nếu fail, sửa hoặc STOP |
| `STEP-06` | Git | Commit + push lên `main` | `git log` + Vercel trigger | Nếu push fail, STOP |
| `STEP-07` | `docs/tasks/hrp-v6-ui-04c1-r5-footer-spacing-fix/HANDOFF.md` | Document diff + revert rationale | Manual review | — |
| `STEP-08` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR | Update R4 → R5 status | YAML valid | — |

## 6. Acceptance

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Footer DOM không có text node "HRP Co.,Ltd" | grep / DOM inspection |
| `AC-02` | Cột 1 spacing: thoáng tự nhiên (≈12px), KHÔNG giãn R4-style | Vercel preview screenshot |
| `AC-03` | Cột 2 spacing: 5 services items cách đều (≈12px) | Vercel preview screenshot |
| `AC-04` | `npm run typecheck` exit 0 | Shell |
| `AC-05` | Diff scope chỉ trong `app/components/GlobalFooter.tsx` | `git diff --stat` |
| `AC-06` | Visual: so với R4 (commit `0e866ca`), spacing CỘT 1+2 gần nhau hơn đáng kể | Vercel preview compare |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `gap-y-3` có thể vẫn giãn nếu Owner muốn spacing tighter | Đổi sang `gap-y-2` (≈8px) hoặc `gap-y-1` (≈4px); rollback bằng `git revert` |
| `RISK-02` | `gap-y-3` services list (5 items, text wrap dài) có thể tạo cột cao hơn các cột khác | Cân đối lại hoặc giữ cũ; grid `1.1fr_1fr_1.1fr` cho phép chênh lệch |
| `RISK-03` | R5 liên tiếp R4 — Owner feedback lần 3 | Nếu R5 vẫn không OK, Tier 1 nên pause hỏi Owner cung cấp spacing reference (px mong muốn, hoặc screenshot OK để match) |

## 8. Open Questions

- Q1: Nếu R5 vẫn chưa đúng, anh muốn em (a) đo spacing pixel từ screenshot OK để match, (b) hỏi design intent cụ thể, hay (c) khác? **[TIER_0_DECISION nếu xảy ra]**

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner yêu cầu 11/09/2026 01:04 revert spacing R4 | Owner feedback trực tiếp |
| R1 | TIER_1_RESOLVED | Tier 1 implement revert theo `tier1.md` workflow bước 4-7, không chờ Tier 0 chốt routine choice |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R5 revert R4 spacing — Owner feedback `justify-between` + `gap-0` giãn quá xa |
