# TASK — `hrp-v6-ui-04c1-r3-footer-text-hotfix`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r3-footer-text-hotfix` |
| Work type | `CODE` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Single-file text correction trên GlobalFooter.tsx (4 dòng), copy-paste typo + address prefix + email spelling. Owner visual review post-deploy đã phát hiện; fix áp dụng trực tiếp. Fast lane NONE: text only, no logic/render change, regression risk = 0.` |
| Spec version | `v0.1 DRAFT` |
| Status | `DRAFT` |
| Planner | `Tier 1` |
| Baseline | `918e2ee` (post-push UI04 round) |
| In-scope roots | `app/components/GlobalFooter.tsx` |
| Forbidden paths | `app/**` (trừ GlobalFooter.tsx), `src/**`, `prisma/**`, `docs/tasks/**` (trừ task folder này), `package.json`, `package-lock.json`, `node_modules/**` |
| Required gates | `pnpm/npm run typecheck` (PASS), `pnpm/npm run build` (PASS), `pnpm/npm run test:unit` (PASS or KNOWN-FAIL pre-existing); visual re-deploy |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `TIER_1_EXECUTE → push → Tier 0 confirm` |

## 1. Outcome

### 1.1 User-visible outcome

- Footer cột 1 hiển thị đúng:
  - **Địa chỉ**: (thêm prefix, Owner đã quyết)
  - **Bắc Kế** (đã sửa typo từ "Bắc Kê")
  - Bỏ chữ "Thuê" ở đầu địa chỉ (chỉ còn "Khu đất DV Tân Ngọc, ...")
  - Email đúng: `nhanluchrp@gmail.com` (đã sửa typo từ `nhaluchrp@gmail.com`)
- `mailto:` link cũng dùng `nhanluchrp@gmail.com`
- Không ảnh hưởng layout, spacing, color, hay các phần khác

### 1.2 Non-goals

- KHÔNG đổi hotline, website, services, ContactForm, copyright
- KHÔNG đổi layout 3 cột, container 1080px
- KHÔNG mở API endpoint mới
- KHÔNG đổi tier-0 directive hay cancel UI04 round

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Visual review checklist tại `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/visual-review-checklist.md` §2.1 AC-04 (links/address) | Owner check fail tại production preview URL |
| `EV-02` | `git diff app/components/GlobalFooter.tsx` (HEAD `918e2ee` → fix) | 4 dòng thay đổi |
| `EV-03` | Production preview URL: https://hrpartner-k2958oa8l-thuans-projects-0b7f4d74.vercel.app (deploy #6376933011) | Visual baseline |
| `EV-04` | Local `npm run typecheck` PASS | Type safety OK |
| `EV-05` | Local `npm run build` PASS | Build OK |
| `EV-06` | Local `npm run test:unit` — 13 pre-existing FAIL tại `design-tokens.static.test.ts` (var(--surface-container-high) unresolved trong `job-opening-status-card.tsx:67`); đã verify bằng `git stash` tại HEAD `918e2ee` — fail không do footer fix | Pre-existing, không block push |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Sửa 4 chỗ text trong GlobalFooter.tsx (địa chỉ prefix, Kê → Kế, bỏ "Thuê", email spelling) | `OWNER_DECIDED` |
| `DEC-02` | Không audit LIGHT (FAST + NONE đủ vì text-only, không có logic change) | `TIER_1_DECIDED` |
| `DEC-03` | Commit riêng (docs(task) footer hotfix r3), không squash vào 04c1 commit cũ | `TIER_1_DECIDED` |
| `DEC-04` | Push lên `origin/main` (Tier 0 directive cho phép push post-deploy fix) | `PENDING_TIER_0` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Footer cột 1 hiển thị "Địa chỉ: Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam" |
| `RQ-02` | Footer cột 1 hiển thị email "nhanluchrp@gmail.com" (không phải "nhaluchrp@gmail.com") |
| `RQ-03` | `mailto:` link trỏ tới `nhanluchrp@gmail.com` |
| `RQ-04` | Không đổi layout/typography/color/services/ContactForm/copyright |
| `RQ-05` | Commit message: `docs(task): ui04 04c1 footer text hotfix r3 -- fix address + email typos from owner visual review` |
| `RQ-06` | Push lên `origin/main` (atomic delivery cùng push) |

### 4.2 Scope boundaries

- **In:** `app/components/GlobalFooter.tsx` (4 dòng text)
- **Out:** Tất cả file khác
- **Allowed task artifacts:** `docs/tasks/hrp-v6-ui-04c1-r3-footer-text-hotfix/**`

### 4.3 Domain boundaries

- **Data/state:** N/A
- **Permission/security:** N/A
- **Interface/API:** N/A
- **Migration/rollback:** N/A — revert bằng `git revert` nếu cần

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/components/GlobalFooter.tsx` | Sửa 3 dòng: address prefix + Kê→Kế + bỏ "Thuê" + email spelling + mailto link | `git diff` show 3 dòng | — |
| `STEP-02` | Local gates | `npm run typecheck` + `npm run build` PASS | Exit 0 | Nếu fail → STOP, fix |
| `STEP-03` | Local test:unit | `npm run test:unit` — 13 pre-existing FAIL OK; không có new fail | Compare count với HEAD `918e2ee` | Nếu có new fail → STOP, fix |
| `STEP-04` | Commit | `git commit -m "docs(task): ..." -- app/components/GlobalFooter.tsx` | Git log show 1 commit | — |
| `STEP-05` | Push | `git push origin main` | GitHub push event OK | — |
| `STEP-06` | Vercel monitor | Đợi Vercel deploy mới, verify text fix tại preview URL | Visual check | — |
| `STEP-07` | PLANNER_HANDOVER update | Append note: 04c1-r3 ACCEPTED, push commit hash | YAML valid | — |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `git diff app/components/GlobalFooter.tsx` HEAD~1..HEAD show đúng 4 dòng thay đổi (1 địa chỉ, 1 mailto, 1 email text) | `git show HEAD --stat` |
| `AC-02` | `npm run typecheck` exit 0 | Shell |
| `AC-03` | `npm run build` exit 0 | Shell |
| `AC-04` | `npm run test:unit` không có new fail so với baseline HEAD `918e2ee` | Compare test count |
| `AC-05` | Vercel deployment mới (sau push) SUCCESS | Vercel dashboard / GitHub API |
| `AC-06` | Visual: text đúng tại production preview URL | Owner visual review (anh tự check) |
| `AC-07` | PLANNER_HANDOVER ROADMAP_CURSOR cập nhật note 04c1-r3 | `docs/PLANNER_HANDOVER.md` grep |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-06` |
| `RQ-02` | `STEP-01` | `AC-01`, `AC-06` |
| `RQ-03` | `STEP-01` | `AC-01` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-02`, `AC-03`, `AC-04` |
| `RQ-05` | `STEP-04` | `AC-01` |
| `RQ-06` | `STEP-05` | `AC-05` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Có typo khác anh phát hiện tiếp | Mở round r4 nếu cần |
| `RISK-02` | test:unit có new fail (không phải pre-existing) | STOP tại STEP-03, fix |
| `RISK-03` | Vercel deploy fail | Revert commit + push lại |

## 8. Open Questions

- None — Owner đã quyết text cuối.

## 9. Planner Resolution

Tier 1 append sau khi task chạy.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial DRAFT sau Owner visual review post-deploy | 4 chỗ text sai: address prefix, Kê/Kế, "Thuê", email spelling |
