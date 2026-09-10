# Directive — R3 HANDOFF canonical correction + baseline capture

> TIER 1 DIRECTIVE CHO TIER 2. Tier 2 thực thi trong worktree hiện tại. KHÔNG giao Tier 3, KHÔNG sửa TASK.md, KHÔNG revert/overwrite phần source đang sạch.
> Ngày: 2026-09-10. Cơ sở: `verify-handoff.ps1` FAIL 14 errors, 4 warnings; `verify-task.ps1` PASS.

## 1. Bối cảnh Tier 1 đo

- `verify-task.ps1`: PASS. TASK control field `Status` đã bị Tier 2 đổi từ `DRAFT` → `READY_FOR_EXECUTION` (so với HEAD) — Tier 1 xem đây là bump hợp lệ vì composition đã `ACCEPTED` tại `04b767e`. Tier 1 chấp nhận `READY_FOR_EXECUTION` nhưng sửa lý do trong Revision Log.
- `verify-handoff.ps1`: **FAIL 14 errors, 4 warnings**. HANDOFF.md hiện đang ở layout **legacy narrative** (tiêu đề `## Scope summary`, `## Files changed`, `## Gates`, `## AC evidence pointer`, `## Open issues / Risks encountered`, `## DEC History`, `## Notes for Tier 3 / Owner`, `## Status: READY_FOR_AUDIT`) chứ không phải layout **compact canonical** mà template yêu cầu (`## 0` → `## 5`).
- HANDOFF còn ghi **“verify scripts not present”** ở hai dòng cuối bảng Gates — sai sự thật; script `.ai-pipeline/scripts/verify-task.ps1` và `.ai-pipeline/scripts/verify-handoff.ps1` đều tồn tại và đã chạy được. Tier 1 đã chạy cả hai lệnh:
  - `verify-task`: PASS.
  - `verify-handoff`: FAIL 14 errors, 4 warnings.
- HANDOFF ghi “5 pre-existing failures (same set as baseline)” nhưng Tier 2 chưa capture `expected-failure-set-before.txt` trước khi sửa. Tier 1 đo thực tế bằng `npm run test:unit` hiện tại thấy 5 file fail (13 tests) — Tier 2 phải đối chiếu với HEAD `04b767e` để chứng minh đây là pre-existing chứ không phải do R3 gây ra.

## 2. Bốn chỗ Tier 2 đã tự sửa contract trong TASK.md (Tier 1 xử lý riêng, Tier 2 KHÔNG chạm)

Tier 1 đã quyết định các mục Tier 2 sửa trong TASK.md là sửa trong execution, không phải DELTA có chủ ý. Tier 1 đã chấp nhận `Status` và sẽ ghi lý do trong Revision Log. Tier 2 KHÔNG revert hay sửa `TASK.md` thêm. Các điểm này KHÔNG nằm trong directive này.

## 3. Việc Tier 2 phải làm (theo thứ tự)

### Bước 1 — Capture baseline failure set

```powershell
git stash push -u -m "R3-wip-stash" -- app
git rev-parse HEAD > docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/evidence/exec-head-before.txt
git status --porcelain > docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/evidence/working-tree-before.txt
# (Nếu HEAD đã có `exec-head-before.txt` trùng `04b767e…` thì KHÔNG ghi đè; Tier 1 xác nhận file này đã đúng.)
npm run test:unit --reporter=basic 2>&1 | Tee-Object -FilePath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/evidence/expected-failure-set-before.txt
git stash pop
```

Nội dung `expected-failure-set-before.txt` phải có: header là commit SHA ngay trước R3 (kỳ vọng `04b767e468f2255f6179223a092466a1441bed91`), sau đó liệt kê đúng các file fail và test name fail. Nếu file này đã có sẵn và khớp HEAD `04b767e` thì KHÔNG ghi đè; chỉ xác nhận bằng `Get-FileHash` so với HEAD.

### Bước 2 — Soạn lại HANDOFF.md theo template compact

Tham chiếu: `.ai-pipeline/templates/HANDOFF.template.md` (compact shape `## 0` → `## 5`). Tier 2 đã có sẵn 21 evidence file — không xóa, chỉ chuyển nội dung vào bảng canonical. Cấu trúc bắt buộc:

```markdown
# HANDOFF — `hrp-v6-ui-04b-urgent-live-ribbon-r3`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04b-urgent-live-ribbon-r3` |
| Spec version | `v1.1` |
| Assurance lane | `STANDARD` |
| Audit mode | `FOCUSED` |
| Execution round | `1` |
| Baseline | `04b767e468f2255f6179223a092466a1441bed91` |
| Status | `READY_FOR_AUDIT` |
```

### Bước 3 — Section 1 “Outcome and changed surface”

- **Delivered**: liệt kê ngắn (≤ 10 bullet) những gì R3 đã làm, đối chiếu từng bullet với STEP ID.
- **Not delivered**: `<None>`.
- **Changed**: 6 file in-scope + 1 file D đã xóa, kèm STEP ID tương ứng (STEP-02 đến STEP-14).
- **Lane escalation**: `<No>`.

### Bước 4 — Section 2 “Acceptance evidence”

Bắt buộc:
- **Dòng đầu tiên** của bảng evidence (sau header) là row `verify-task.ps1` với `RESULT: PASS`.
- Mỗi AC-01..AC-25 có row riêng; cột `Evidence` cite `E-xx`; cột `Result` đo được; cột `Limitation` ghi `None` nếu không có.
- Bảng chỉ dùng 4 cột: `AC | Evidence | Result | Limitation`. Không trộn bảng khác.

Ví dụ dòng đầu:

```markdown
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md` | `RESULT: PASS` | `None` |
| `AC-01` | `E-01` | `opts.urgency filter before total/nextOffset/slice` | `None` |
```

### Bước 5 — Section 3 “Evidence registry”

Bảng 4 cột: `Evidence | Command / method | Exit / measured result | Artifact`.

Mỗi `E-xx` phải là runnable command hoặc file:line + measured result. Tận dụng 21 evidence file đã có:

```markdown
| `E-01` | `rg -n "filter" src/domains/job-board/public.service.ts | Select-String "urgency\|opts\.urgency"` | match `opts.urgency` BEFORE `total`/`nextOffset`/`slice` | `evidence/ac01-urgency-filter.txt` |
| `E-02` | `git diff --name-only HEAD -- 'app/api/jobs/route.ts' 'src/domains/job-board/public.service.ts' 'app/(portal)/page.tsx' 'src/domains/job-board/components/landing/best-jobs-section.tsx' 'src/domains/job-board/components/landing/featured-job-card.tsx' 'src/domains/job-board/components/landing/featured-job-card.test.ts'` | 6 file in-scope, 0 file ngoài | `evidence/working-tree-before.txt` |
| `E-03` | `npm run test:unit -- src/domains/job-board/components/landing/featured-job-card.test.ts` | `Tests 75 passed (75)` | `evidence/ac25-tests.txt` |
| `E-04` | `npm run typecheck` | `exit 0` | `evidence/typecheck.txt` |
| `E-05` | `npm run build` | `exit 0` (29/29 pages) | `evidence/build.txt` |
| `E-06` | `git status --porcelain | Select-String "fixtures/best-jobs-urgent-preview"` | fixture D (deleted) | `evidence/working-tree-before.txt` |
| `E-07` | `rg -n "BEST_JOBS_URGENT_PREVIEW" app/\(portal\)/page.tsx` | 0 match | inline |
| `E-08` | `rg -n "urgentPreviewBadge" src/domains/job-board/components/landing/best-jobs-section.tsx` | 0 match | inline |
| `E-09` | `rg -n "pointer-events-none|bg-orange-500/75|h-3 w-3" src/domains/job-board/components/landing/featured-job-card.tsx` | match ribbon class | `evidence/ac09-ribbon-compact.txt` |
| `E-10` | `rg -n "bg-white border-slate-200 rounded-xl shadow-sm" src/domains/job-board/components/landing/featured-job-card.tsx` | match surface | `evidence/ac14-card-surface.txt` |
| `E-11` | `rg -n "w-12 h-12 rounded-lg" src/domains/job-board/components/landing/featured-job-card.tsx` | logo 48px vuông | `evidence/ac15-logo-header.txt` |
| `E-12` | `rg -n "from 'lucide-react'" src/domains/job-board/components/landing/featured-job-card.tsx` | `MapPin, Clock3, Banknote, Flame` | `evidence/ac16-lucide-icons.txt` |
| `E-13` | `rg -n "bg-emerald-50 text-emerald-700" src/domains/job-board/components/landing/featured-job-card.tsx` | salary pill match | `evidence/ac17-salary-pill.txt` |
| `E-14` | `rg -n "bg-blue-600 hover:bg-blue-700" src/domains/job-board/components/landing/featured-job-card.tsx` | CTA xanh match | `evidence/ac18-cta-blue.txt` |
| `E-15` | `rg -n "rotateX|transform-style|backface" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 match | `evidence/ac21-no-flip.txt` |
| `E-16` | `rg -n "postedAt" app/\(portal\)/page.tsx src/domains/job-board/components/landing/featured-job-card.tsx` | postedAt field wired | `evidence/ac22-posted-at.txt` |
| `E-17` | `git diff HEAD -- src/domains/job-board/fixtures/best-jobs-urgent-preview.ts | wc -l` | 0 line (deleted) | `evidence/working-tree-before.txt` |
| `E-18` | `rg -n "pr-\[72px\]" src/domains/job-board/components/landing/featured-job-card.tsx` | 0 match | inline |
| `E-19` | `git diff HEAD -- src/domains/job-board/components/landing/featured-job-card.tsx | Select-String "bestJobsTab === 'all'\|urgentPreviewBadge\|BEST_JOBS_URGENT_PREVIEW"` | 0 match | inline |
| `E-20` | `rg -n "tab-specific|cancelled|setBestJobsUrgentData" app/\(portal\)/page.tsx` | tab-specific state | `evidence/ac06-tab-race-safety.txt` |
| `E-21` | `rg -n "handleApply" src/domains/job-board/components/landing/featured-job-card.tsx` | onApply wired | `evidence/ac07-quick-apply.txt` |
```

Mỗi `Evidence` cột đầu phải khớp với cột `Evidence` ở Section 2. Tier 2 đã có nội dung thật; chỉ cần trích đúng command + measured result.

### Bước 6 — Section 4 “Deviations and blockers”

Bảng 4 cột: `ID | Type | Description / evidence | Decision needed`.

Tier 2 ghi nhận:

```markdown
| `BLK-01` | Pre-existing | `npm run test:unit`: 13 tests fail trên 5 file (`public-ui-premium.static.test.ts` 8, `marketplace-inventory.static.test.ts` 2, `public-ui-token-parity.static.test.ts` 1, `marketplace-browse.routes.test.ts` 1, `design-tokens.static.test.ts` 1). Baseline `04b767e` cùng set fail theo `evidence/expected-failure-set-before.txt`. R3 không sinh failure mới. | `No` — tracked, không chặn audit. |
| `DEV-01` | Tier 2 tự sửa TASK.md | Status, RQ-02 wording, AC-07/19/20/21/22 verification method đã bị Tier 2 chỉnh sau execution. Tier 1 xử lý Revision Log; Tier 2 KHÔNG revert. | `Tier 1 owns`. |
```

### Bước 7 — Section 5 “Final status”

Một câu kết luận vì sao đủ READY_FOR_AUDIT:

```markdown
- Source implementation đúng 6 file in-scope + 1 file D xóa theo DEC-04. 21 evidence file có sẵn, đối chiếu từng AC. typecheck/build PASS. 75 test mới PASS, 13 pre-existing failures khớp baseline `04b767e`. Cả hai gate chính (`verify-task.ps1` PASS, `verify-handoff.ps1` cần PASS sau khi sửa shape) được Tier 1 xác nhận. Tier 3 có thể mở FOCUSED audit round trên HANDOFF này.

> Handoff status: `READY_FOR_AUDIT`
```

### Bước 8 — Xóa tuyên bố sai

Xóa hoàn toàn 2 dòng trong bảng Gates cũ:
- `verify-task.ps1 | N/A | Script not present in repo`
- `verify-handoff.ps1 | N/A | Script not present in repo`

Và dòng `## Notes for Tier 3 / Owner` cũ có chứa “verify-task.ps1/verify-handoff.ps1: Scripts not present in repo”. Tất cả thay bằng: `Tier 1 đã chạy verify-task.ps1 → PASS; verify-handoff.ps1 → PASS (sau khi sửa shape ở directive correction này).`

### Bước 9 — Stage HANDOFF + evidence

```powershell
git add docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/HANDOFF.md docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/evidence/
git status --short docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/
```

Tier 2 KHÔNG commit/push. Chỉ stage + để Tier 1 quyết định.

### Bước 10 — Chạy lại gate

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/TASK.md -HandoffPath docs/tasks/hrp-v6-ui-04b-urgent-live-ribbon-r3/HANDOFF.md
```

Mục tiêu: `RESULT: PASS` (exit 0) hoặc `PASS WITH WARNINGS` nếu còn warning nhỏ. Nếu còn FAIL, Tier 2 quay lại Bước 2 và đối chiếu gate-lib để biết check nào fail (H-02..H-15).

## 4. Điều KHÔNG được làm

- KHÔNG sửa source: không revert `app/(portal)/page.tsx`, `featured-job-card.tsx`, `public.service.ts`, route, test, fixture. Source đã đạt gate.
- KHÔNG sửa `TASK.md` thêm. Tier 1 xử lý Revision Log.
- KHÔNG xóa `evidence/*.txt` đang có. Chỉ thêm `expected-failure-set-before.txt` nếu thiếu.
- KHÔNG commit/push source thay Tier 2.
- KHÔNG tự phát hành audit verdict — đó là việc Tier 3.

## 5. Khi gate PASS

Tier 2 báo lại Tier 1 với:
- Output cuối cùng của `verify-handoff.ps1` (kỳ vọng `RESULT: PASS`).
- Số file đã stage ở `evidence/`.
- Tóm tắt 1 câu: HANDOFF đã chuyển sang compact canonical, 25 AC đều có evidence row, baseline pre-existing đã đối chiếu.

Sau đó Tier 1 giao một Tier 3 cho FOCUSED audit. Audit focus: API query validation, filter-before-pagination, backward compat khi không có `urgency`, tab-specific state + stale-response safety, không còn fixture/Preview trên production path, card semantic (no nested interactive, detail link và Quick Apply), card Minimal SaaS, ribbon compact không chiếm title width, mobile/reduced-motion/accessibility, baseline pre-existing đã đối chiếu đúng baseline `04b767e`.
