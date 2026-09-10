

## 6. Tier 1 answers (locked 2026-09-07 14:01 Asia/Bangkok)

### C-13 `role-guard-layout.tsx` (+78/-33)

**ANSWER: COMMIT SCOPED trong task `hrp-v6-p1c-new-ui-restyling`.**

Reason: SEP đã chọn Hướng B ngày 07/09 11:15 (new-ui/ trong worktree, 16 file .tsx/.md/.png). Patch này là implementation contract Phase 1C — thêm `section: 'development'` cho 4 nav item (Chấm công, Đối soát, Phản ánh, Tính lương) để chuẩn bị Phase 1C theo DEC-04 + EV-08 (4 section: Hero + BestJobs + Areas + Search, KHÔNG ship TopCompaniesSection/CompanyCard vì cột `ClientCompany.publicName` chưa thuộc contract Phase 1A).

Action: Tier 1 mở task `hrp-v6-p1c-new-ui-restyling` execution round 1 với step STEP-01 (commit scoped role-guard-layout.tsx với baseline hiện tại `2f7baf0`). Phase 1A + 1B vẫn ACCEPTED trước khi Phase 1C mở round (theo DEC-01 của Phase 1C task).

### C-11 `package.json/lock.json` (+2 lines)

**ANSWER: REVERT cả `package.json` + `package-lock.json` (Vì `tests/browser/` không được track — xem C-30).**

Reason: `test:browser: playwright test` đã có sẵn từ HEAD `4f5ba53` (không phải mới). Worktree hiện KHÔNG khác HEAD về script đó. Cái mới chỉ là devDep `@playwright/test 1.62.1`. Spec test-01 đã ACCEPTED round 2 ngày 07/09 (Vitest 1735/1735, typecheck exit 0); không cần playwright thực sự cho spec đó (Tier 5 đã dùng Vitest trong task test-01).

Action: Tier 2 revert `package.json` + `package-lock.json` về HEAD `2f7baf0`. Nếu Tier 5 muốn thêm playwright thật sự, mở task riêng `hrp-v5-test-02-browser-e2e` (DRAFT) — không bake vào task 21 window.

### C-26 `update_globals.js`

**ANSWER: MOVE-TO-SCRATCH** (C-26b, đổi từ CLEANUP-PLAN C-26 ban đầu).

Reason: file này đọc `new-ui/code.html` để extract colors → ghi vào `app/globals.css`. Đây là dev hack cho Hướng B (ngày 07/09 11:15), không phải test fixture. Khi Phase 1C mở execution round, file này sẽ được dùng lại, nhưng không nên track trong main.

Action: `mv update_globals.js scratch/update_globals-2026-09-07.js` (kèm `new-ui/` → `scratch/new-ui-HuongB-ref-2026-09-07/`).

### C-48 `.claude/`

**ANSWER: THÊM `.claude/` VÀO `.gitignore`.**

Reason: 9 thư mục skills (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`) + thư mục `worktrees/`. Đây là Cursor/Claude dev artifacts cho agent skill system, không phải source code project. Nếu project là open source / multi-developer thì `.claude/` riêng cho mỗi user sẽ gây noise; nên ignore.

Action: append `.claude/` vào `.gitignore` (sau line 84).

## 7. Final action list (locked)

Sau khi lock 4 answers trên, Tier 2 chạy đúng các bước sau trong window 2026-09-08 09:00-09:30 (hoặc sớm hơn nếu Tier 1 cho phép):

1. **Tier 1 ngay bây giờ** (locked 14:01): apply 4 answers (commit C-13 scoped Phase 1C + revert C-11 + gitignore C-48 + commit cleanup helper).
2. **Tier 2 STEP-10 task 21** (window 09:00-09:30): `git clean -f` rác (C-14..C-25); `mv` move-to-scratch (C-26b, C-28..C-31); `git rm docs/aff_plan.md` (C-49); commit cleanup + CLEANUP-PLAN execution log.
3. **Tier 2 task security** (cùng window): STEP-01..03 untrack + sanitize `check_rls.cjs` (C-01); STEP-04..06 rotate.
4. **Tier 1 verify post-cleanup**: `git status --porcelain` = 0 line; `rg npg_E0eqUu7aHtpI` chỉ whitelist.

