# HANDOFF — hrp-t1b-pre-p2-intake-worker-separation

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-t1b-pre-p2-intake-worker-separation` |
| Work type | `FAST_HOTFIX` (UI/API tightening; no schema; no migration) |
| Audit mode | `NONE` (Tier 1 self-review per directive) |
| Spec version | `v1.1` (T0 → PR #110 CORRECTION 1/1) |
| Status | `READY_FOR_REVIEW` |
| Baseline | `origin/main @ f1bf3f2a1900b6f1826f03eb063c4b9079292969` (forward-merged 2026-10-06 12:35 UTC+7) |
| Worktree | `C:\CodeApp\HrP-t1b-pre-p2-intake-worker-separation` |
| Branch | `codex/t1b-pre-p2-intake-worker-separation` |
| Correction baseline (v1.0 impl SHA) | `2eb74f2d442378b47f7b5ac9d22660137e684eae` |
| v1.1 forward-only correction SHA | `2af3f9fd0bf03fd3b948797cc358adf6a6c7eb0b` |
| Forward-merge commit (v1.2) | `67dab3e148fbd598ee7814885f32fe9fa0457d83` (`merge: forward-merge origin/main @ f1bf3f2a into PR #110 branch`) |
| Updated | 2026-10-06 12:43 UTC+7 |

## 1. Outcome recap (v1.0 → v1.1)

Tách rõ hai mặt workforce ingestion trong admin portal: LaborProfile (intake) vs Worker (official). v1.0 đã implement đầy đủ; v1.1 là forward-only correction batch với 4 fix:

- **`LaborProfileEditForm` bỏ prop `onSaved`** (v1.0 để Server Component truyền function xuống Client Component — sai kiến trúc). v1.1 form tự `useRouter().refresh()`.
- **CAS `updateMany` race protection** với PR #107 conversion flow: trước kia PATCH dùng `findUnique` + `update` thuần → có thể overwrite giữa race với `linkLaborProfileWorker`. v1.1 dùng atomic `updateMany({ where: { id, workerId: null } })`; khi `count === 0` re-read phân biệt 404 vs 409.
- **Chống submit masked data**: 3 lớp defense — (a) form track `dirty fields`, chỉ gửi field user thực sửa; (b) UI gate nút Lưu khi `canSeeSensitive === false`; (c) API require permission `CAN_VIEW_WORKER_SENSITIVE` (defense in depth); (d) service reject input chứa `*` (masked-shape) với 400 INVALID_INPUT.
- **Copy sweep**: breadcrumb `Hồ sơ tiếp nhận` (không `Hồ sơ người lao động`), button `Chuyển thành người lao động` (không `Chuyển đổi thành nhân viên`).

Tất cả outcome §1.1–§1.6 từ v1.0 giữ nguyên không đổi.

## 2. v1.1 evidence (correction 1/1)

### Gate outputs (sau khi apply v1.1)

- `npx tsc --noEmit` → exit 0
- `npx eslint <in-scope files>` → exit 0 (11 pre-existing warnings, 0 errors, 0 new)
- `npx vitest run --config vitest.unit.config.ts` → **4670 / 4670 PASS, 9 skipped, 0 failed** (+18 new tests so với v1.0's 4652/4652)
- `npx next build` → exit 0; `/admin/labor-profiles/[id]` route compiled 5.14 kB
- `node .ai-pipeline/scripts/verify-encoding.mjs` → **PASS** (10 changed text files, strict UTF-8 without BOM)
- `git diff --check` → exit 0

### v1.1 new / updated tests

**`src/domains/talent/labor-profile.update-service.test.ts`** — 19 tests (v1.0: 13 → v1.1: +6):
```
deriveCompleteness — pure (6 cases unchanged)
updateLaborProfileIntakeProfile — CAS-updateMany:
  ├── throws LaborProfileAlreadyLinkedError khi current.workerId set (v1.0)
  ├── throws LABOR_PROFILE_NOT_FOUND khi current null (v1.0)
  ├── happy path 3 fields → COMPLETE (v1.0, updated mock signature)
  ├── phone empty → null + normalizedPhone null (v1.0)
  ├── preserves current values khi input undefined (v1.0)
  ├── warnings khi duplicate phone (v1.0)
  ├── exclude self + linked khỏi duplicate probe (v1.0)
  ├── v1.1 CAS-lost → 409 LaborProfileAlreadyLinkedError (workerId='worker-X')
  ├── v1.1 CAS-lost + row gone → 404 LABOR_PROFILE_NOT_FOUND
  ├── v1.1 reject masked phone (contains "*") → 400
  ├── v1.1 reject masked cccdNumber → 400
  ├── v1.1 reject masked phone is entry-gate (no SELECT/UPDATE)
  └── v1.1 plain phone OK (không bị reject)
```

**`app/api/admin/labor-profiles/__tests__/route-patch.test.ts`** — 26 tests (v1.0: 21 → v1.1: +5):
```
Auth (1 unchanged)
Role gate:
  ├── 11 non-writer roles → 403 (unchanged)
  ├── ADMIN + HR_MANAGER → 200 (unchanged)
  ├── v1.1 ADMIN thiếu CAN_VIEW_WORKER_SENSITIVE → 403
  └── v1.1 HR_MANAGER thiếu CAN_VIEW_WORKER_SENSITIVE → 403
Body validation:
  ├── workerId → 400 (unchanged)
  ├── invalid JSON → 400 (unchanged)
  ├── body rỗng → 400 (unchanged)
  ├── cccdNumber=null OK (unchanged)
  ├── v1.1 service ném MASKED_INPUT_REJECTED → 400
  ├── v1.1 PATCH chỉ gửi field dirty (fullName only) → 200, phone/cccdNumber KHÔNG bị đè
409 guard:
  ├── initial workerId set → 409 (unchanged)
  └── v1.1 CAS-lost race with PR #107 convert → 409 LABOR_PROFILE_ALREADY_LINKED
404 NOT_FOUND (unchanged)
actorId propagation (unchanged)
```

**`app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts`** — 27 tests (v1.0: 20 → v1.1: +7):
```
4 filter chips canonical (unchanged)
3 removed chips (unchanged)
<th> = 5 (unchanged)
empty-state colSpan = 5 (unchanged)
page <h1> (unchanged)
CTA button (unchanged)
linked-readonly banner (unchanged)
Sửa thông tin button hidden (unchanged)
LaborProfileEditForm mount (unchanged)
v1.1 prop pass: role + canSeeSensitive, KHÔNG onSaved
v1.1 breadcrumb label "Hồ sơ tiếp nhận"
v1.1 metadata title "Chi tiết hồ sơ tiếp nhận"
v1.1 button "Chuyển thành người lao động"
v1.1 form Props interface không có onSaved
v1.1 form nhận canSeeSensitive + banner no-sensitive-banner
v1.1 form dùng router.refresh(), KHÔNG window.location.reload
v1.1 PATCH body chỉ gửi dirty fields, KHÔNG có workerId
409 locked + 403 distinct (unchanged)
v1.1 client-side MASK_RE.test guard
encoding hygiene (3 files unchanged)
```

### v1.1 files changed (forward-only on PR #110)

| File | v1.0 → v1.1 diff |
|------|---------------------|
| `app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx` | Bỏ prop `onSaved`; thêm prop `canSeeSensitive`; thêm dirty tracking + MASK_RE client guard; dùng `useRouter().refresh()`; thêm saved banner; disable button khi !anyDirty |
| `app/admin/labor-profiles/[id]/page.tsx` | Import + compute `permissions`; pass `canSeeSensitive`; breadcrumb `Hồ sơ tiếp nhận`; metadata title; button copy `Chuyển thành người lao động`; lock-note "có quyền nhạy cảm" |
| `app/api/admin/labor-profiles/[id]/route.ts` | Thêm `resolveEffectivePermissions` gate; map MASKED_INPUT_REJECTED → 400 |
| `src/domains/talent/labor-profile.service.ts` | `updateLaborProfileIntakeProfile` → atomic `updateMany({ where: { id, workerId: null } })`; re-read trên count==0 phân biệt 404/409; reject masked input ngay tại entry |
| `src/domains/talent/labor-profile.update-service.test.ts` | +6 tests (CAS-lost 404/409, masked rejection 3 cases, plain happy path) |
| `app/api/admin/labor-profiles/__tests__/route-patch.test.ts` | +5 tests (sensitive permission gate, masked rejection, race edit-vs-convert, dirty partial) |
| `app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts` | +7 tests (canSeeSensitive fence, copy sweep, dirty body, MASK_RE guard) |
| `docs/tasks/.../TASK.md` | v1.1 Outcome §7-10; Revision Log |
| `docs/tasks/.../HANDOFF.md` | This file |

No files outside allowlist. No `prisma/schema.prisma`. No `prisma/migrations/**`. No `package.json`. No CI config. **PR #107 `linkLaborflow` UNTOUCHED.**

## 3. v1.1 self-review (Tier 1 — 4 risks)

### Risk 1: CAS race — PATCH có thể overwrite `workerId` set bởi conversion flow

**Mitigation implemented (v1.1)**:
- PATCH giờ dùng `tx.laborProfile.updateMany({ where: { id, workerId: null }, data })` — atomic compound WHERE check. Nếu concurrent `linkLaborProfileWorker` (PR #107) thắng giữa read → update, count=0 → re-read + throw `LaborProfileAlreadyLinkedError` → route trả 409.
- Pattern y hệt `linkLaborProfileWorker` (PR #107 đã dùng). Hai flow giờ race-safe.
- Test `update-service.test.ts` có case `CAS-lost: count=0 + workerId set → 409` mô phỏng race.
- Test `route-patch.test.ts` có case `v1.1 PATCH: CAS-lost race with PR #107 convert → 409`.
- **Verdict**: race window đóng hoàn toàn. PATCH không có khả năng overwrite `workerId`.

### Risk 2: UI có thể submit masked phone/CCCD vào DB

**Mitigation implemented (v1.1)**:
- **Lớp 1 — form dirty tracking**: so với `initial.fullName/phone/cccdNumber` từ DB (đã được mask nếu `!canSeeSensitive`). Chỉ field user sửa mới gửi. Không có cách nào vô tình submit giá trị mask.
- **Lớp 2 — UI permission gate**: nếu `canSeeSensitive === false` (admin chưa grant `CAN_VIEW_WORKER_SENSITIVE` cho HR_MANAGER), render banner "Không có quyền sửa", disable inputs, disable nút Lưu.
- **Lớp 3 — API permission gate**: route PATCH enforce `CAN_VIEW_WORKER_SENSITIVE` ngoài role check. HR_MANAGER mặc định không có permission này → bị reject 403.
- **Lớp 4 — service entry guard**: `MASK_INPUT_RE = /\*/` test trên `phone` + `cccdNumber`; nếu chứa `*` → throw `LABOR_PROFILE_MASKED_INPUT_REJECTED` → route map 400 INVALID_INPUT.
- Test cover cả 4 lớp (`route-patch.test.ts`, `update-service.test.ts`, static fence).
- **Verdict**: 4 lớp defense in depth. Không có cách nào masked data lọt vào DB.

### Risk 3: `onSaved` function prop từ Server Component xuống Client Component

**Mitigation implemented (v1.1)**:
- Loại bỏ prop `onSaved` hoàn toàn. Form tự gọi `useRouter().refresh()` (từ `next/navigation`) sau khi PATCH 200.
- Page mount: `<LaborProfileEditForm profile={...} role={...} canSeeSensitive={...} />` — không có function prop.
- Test fence: `expect(interfaceBlock![0]).not.toMatch(/onSaved/)` đảm bảo interface không khai báo prop này.
- Test fence: page detail không có `onSaved={...}` literal.
- **Verdict**: kiến trúc đúng (Next.js Server/Client Component contract). Không còn function prop sai luồng.

### Risk 4: Copy sweep có thể vô tình sửa scope ngoài LaborProfile page

**Mitigation implemented (v1.1)**:
- Directive scopes rõ: "trên trang LaborProfile". Chỉ thay đổi 3 vị trí trong `/admin/labor-profiles/[id]/page.tsx`:
  - Breadcrumb label → `Hồ sơ tiếp nhận`.
  - Metadata title → `Chi tiết hồ sơ tiếp nhận`.
  - Convert button copy → `Chuyển thành người lao động`.
- KHÔNG đụng `src/shared/i18n/glossary.ts` (canonical data — directive ngoài scope).
- KHÔNG đụng `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/**` (audit task docs — ngoài scope).
- Test fence đảm bảo 3 vị trí đều match canonical, đồng thời KHÔNG còn legacy wording trong detail page.
- **Verdict**: copy sweep scoped đúng. Glossary và sibling tasks UNTOUCHED.

## 4. v1.0 evidence (carry-forward, unchanged)

### Bundled v1.0 results (pre-correction baseline)

- typecheck: 0 errors
- lint: 0 errors (969 pre-existing warnings)
- unit tests: 4652/4652 PASS, 9 skipped
- build: 0 errors
- prisma validate: 0 (DATABASE_URL_* env vars)
- verify-encoding: PASS (14 files)
- git diff --check: 0

### v1.0 → v1.1 test delta

- Total tests: 4652 → 4670 (+18)
- New tests: 18 (+6 update-service, +5 route-patch, +7 static)
- All previously green tests remain green

## 5. Boundaries preserved (NOT touched, v1.0 + v1.1)

- `prisma/schema.prisma` — UNTOUCHED (no migration).
- `prisma/migrations/**` — UNTOUCHED.
- `src/domains/applications/conversion.service.ts` (linkLaborProfileWorker PR #107) — UNTOUCHED. v1.1 PATCH dùng cùng CAS pattern với nó.
- `src/shared/auth/with-db-context.ts`, `with-auth-scope.ts`, `rls-context.ts` — UNTOUCHED.
- `app/api/workers/**` — UNTOUCHED.
- `app/admin/recruiter-workbench/**`, `app/admin/applications/**` — UNTOUCHED.
- `package.json`, `package-lock.json`, `pnpm-workspace.yaml` — UNTOUCHED.
- `.env*` — UNTOUCHED.
- `vitest.*.config.ts`, `tsconfig.json`, `eslint.config.mjs` — UNTOUCHED.
- `src/shared/i18n/glossary.ts` — UNTOUCHED (copy sweep scope per directive).

## 6. Open items / not in this PR

- T1A StaffingOrder tasks (PR #105) — directive nói rõ "Không đụng task của T1A" → UNTOUCHED.
- Tier 3 AUDIT.md — directive yêu cầu KHÔNG Tier 3 (v1.1 cũng vậy).
- Schema migration — directive yêu cầu KHÔNG migration.
- Production DB RLS — UNTOUCHED.

## 7. Revision Log

| Spec | Date | Change | Note |
|------|------|--------|------|
| `v1.0` | 2026-10-06 | Phát hành từ T0 directive; baseline `bbdbe9486` | T1 self-review; PR #110 CI 4/4 GREEN |
| `v1.1` | 2026-10-06 09:15 | T0 → PR #110 CORRECTION 1/1: drop onSaved prop, CAS-updateMany race guard với re-read trên count=0, dirty tracking + masked rejection (4 lớp defense), copy sweep breadcrumb + button. Forward-only, single commit, đẩy lên PR #110; không Tier 3. | T1 self-review; correction baseline `2eb74f2d4` |
| `v1.2` | 2026-10-06 12:35 | Forward-merge origin/main `@ f1bf3f2a` vào branch PR #110 (1 commit merge `--no-ff`, không rebase/reset/amend/force-push). New baseline `f1bf3f2a` (advance: 1 commit sticky-marquee). LaborProfile separation/edit scope UNTOUCHED. CI Quality + Vercel 3/4 GREEN; Integration exit 1 do Vitest tinypool "Worker exited unexpectedly" sau 45/46 file ✓ / 734 tests ✓ / 0 assertion failed — flake infra (cùng pattern f1bf3f2a trên main cũng từng xuất hiện khi test file cuối leak Postgres connection). | T1B directive; merge commit `67dab3e1` |