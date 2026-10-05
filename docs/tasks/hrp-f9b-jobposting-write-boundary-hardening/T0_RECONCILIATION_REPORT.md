# T0 → T1A — F9-B Evidence Integrity Reconciliation Report

**Run date:** 2026-10-03 22:35 ICT (Sat)
**Reconciliation owner:** T0 (lập ledger, phân loại, xác minh HEAD, chạy Prisma gate tại exact final HEAD)
**Final HEAD verified:** `867f8882ead9d892e65c90ae1daf34d8bb8a090c` (branch `codex/t1a-f9b-jobposting-write-boundary-hardening`, worktree `C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening`)
**Status:** **CHANGES_REQUIRED / NOT_READY_FOR_AUDIT — đồng thuận với verdict của T0 handback**
**Recommended next gate:** T0_RUNTIME_REPRODUCE (per section H)

---

## A. Tóm tắt verdict

| Mục | Canonical claim (HANDOFF tại HEAD 867f8882) | Appended background-task claim | Reconciliation result |
| --- | --- | --- | --- |
| `npx prisma validate` | PASS (EV-11) | FAIL — UNKNOWN_COMMAND (task 670366) | **CẢ HAI KHÔNG MÂU THUẪN** khi phân loại đúng (xem Bảng 1, mục D) |
| F9-B integration 17/17 ×3 | PASS (EV-04) | FAIL — 6/17 (670371), 5/17 (670372) | **MÂU THUẪN thực sự** khi cả ba đều được claim "tại exact final HEAD" — phân loại theo mục E dưới đây |
| F9 integration 12/12 ×3 | PASS (EV-05) | (không có task automation report FAIL) | Chỉ canonical claim; chưa thấy bằng chứng automation-level ×3 trong 670359–670372 tại F9-B worktree |
| Predecessor regression 78/78 | PASS (EV-06) | (tasks 670361, 670364) | **KHÔNG ÁP DỤNG** — predecessor regressions chạy trong **sibling worktree** `t1a-f9-hr-staff-jobposting-scope`, không phải F9-B worktree (xem mục B) |
| Full unit suite 3611/9 skip/0 fail | PASS (EV-10) | PASS ×2 (670369, 670370) tại F9-B worktree, tại SHA `cd316966` (pre-HANDOFF commit) | **ĐỒNG THUẬN — SUPERSEDED_PRE_FIX** (chạy trước khi HANDOFF commit được tạo) |
| AC-02 DB negative proof | PASS (8/8 cases) | FAIL — promise resolved `+0` thay vì reject (670372) | **CẦN PHÂN LOẠI** (xem mục F) |
| AC-03 two-connection race | PASS (1/1) | FAIL — assignment `null` thay vì `REVOKED` (670371) | **CẦN PHÂN LOẠI** (xem mục G) |

**Kết luận:** Canonical HANDOFF claim và appended background-task failures là hai tập chạy **tại các SHA khác nhau**, không tại cùng final HEAD `867f8882`. Canonical claim đúng về mặt thủ tục (HANDOFF tồn tại, evidence IDs được liệt kê), nhưng appended failures KHÔNG thể được phủ nhận bằng cách chỉ gắn nhãn "stale ledger" — chúng cần được tái sản xuất (runtime reproduction) tại exact final HEAD trước khi đưa đi audit.

---

## B. Phân loại hành động trước khi lập ledger

Trước khi xếp loại, ledger bắt buộc có SHA, exit code, count, evidence path. Có hai observation từ ledger so với HANDOFF claim:

1. **Predecessor DB regressions (task 670361, 670364) chạy trong SIBLING worktree** `t1a-f9-hr-staff-jobposting-scope` (HEAD `1b9bbd9f`), **KHÔNG** trong F9-B worktree. Điều này mâu thuẫn với EV-06 trong HANDOFF nếu EV-06 được claim là chạy tại F9-B worktree — cần owner của F9-B giải thích: hoặc (a) predecessor regressions đã được thừa kế evidence từ F9 X5 và chỉ cite, hoặc (b) chưa chạy lại tại F9-B worktree. **ACTION REQUIRED**: re-run EV-06 tại F9-B worktree tại HEAD `867f8882`.

2. **F9-B integration suite 17/17 ×3 chưa có automation-level evidence trong terminal log 670359–670372.** Canonical HANDOFF ghi "EV-04 — F9-B synthetic suite ×3" nhưng terminal log chỉ có hai lần chạy (670371, 670372) cùng tệp test, cùng worktree, cùng tối 21:34/21:36 ICT, đều FAIL. Cần xác minh ×3 ở đâu (cách nào đó tại worktree khác, hoặc log trước 670359).

3. **F9 original suite 12/12 ×3 cũng chưa có automation-level evidence trong 670359–670372.** Canonical claim không có task backing trong ledger hiện tại.

---

## C. Chronological execution ledger

Bảng 1 — toàn bộ task IDs 670359–670372 từ `C:\Users\Admin\.cursor\projects\c-CodeApp-HrP\terminals\`.

| # | task_id | startedAt (UTC) | finishedAt (UTC) | cwd / worktree | branch | HEAD tại thời điểm chạy | Command | Exit | Counts (passed/failed/skipped) | Evidence file | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 670359 | 13:12:16 | 13:13:48 | `t1a-f9-hr-staff-jobposting-scope` | `codex/t1a-f9-hr-staff-jobposting-scope` | `1b9bbd9f` | `sleep 60; Get-Content 670358.txt -Tail 30` (wait-only) | 0 | n/a | `terminals/670359.txt` | (wait poller — ignore) |
| 2 | 670360 | 13:12:48 | 13:13:51 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `sleep 60; Get-Content 670358.txt -Tail 50` (wait-only) | 0 | n/a | `terminals/670360.txt` | (wait poller — ignore) |
| 3 | 670361 | 13:17:07 | 13:18:50 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `npx vitest run -c vitest.integration.config.ts tests/db/job-posting-authoring.integration.test.ts tests/db/p1a04-canonical-flow.integration.test.ts tests/db/p1a04-scoped-recruiter-authority.integration.test.ts` | 0 | **43/0/0** (3 files) | `terminals/670361.txt` | **SUPERSEDED_PRE_FIX (wrong worktree; runs F9 X4 predecessor tests, not F9-B)** |
| 4 | 670362 | 13:17:51 | 13:18:54 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `sleep 60; Get-Content 670361.txt -Tail 30` | 0 | n/a | `terminals/670362.txt` | (wait poller — ignore) |
| 5 | 670363 | 13:18:34 | 13:19:08 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `sleep 30; Get-Content 670361.txt` | 0 | n/a | `terminals/670363.txt` | (wait poller — ignore) |
| 6 | 670364 | 13:19:16 | 13:20:17 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `npm run build` | 0 | n/a (build OK) | `terminals/670364.txt` | **SUPERSEDED_PRE_FIX (wrong worktree; build of F9 X4, not F9-B)** |
| 7 | 670365 | 13:19:55 | 13:20:58 | `t1a-f9-hr-staff-jobposting-scope` | (same) | `1b9bbd9f` | `sleep 60; Get-Content 670364.txt -Tail 20` | 0 | n/a | `terminals/670365.txt` | (wait poller — ignore) |
| 8 | **670366** | 13:48:13 | 13:49:34 | `t1a-f9b-jobposting-write-boundary-hardening` | `codex/t1a-f9b-jobposting-write-boundary-hardening` | `e018dd0a` (last commit trước 21:35 ICT) | `npx prisma validate` | **2** (UNKNOWN_COMMAND) | n/a | `terminals/670366.txt` | **CURRENT_FAILURE (misrouted invocation — see mục D)** |
| 9 | 670367 | 13:49:18 | 13:50:01 | (same) | (same) | `e018dd0a` | `sleep 30; cat 670366.txt` (wait poller) | 0 | n/a | `terminals/670367.txt` | (wait poller — ignore) |
| 10 | 670368 | 13:50:02 | 13:50:44 | (same) | (same) | `e018dd0a` | `sleep 30; cat 670366.txt` (wait poller) | 0 | n/a | `terminals/670368.txt` | (wait poller — ignore) |
| 11 | 670369 | 13:59:55 | 14:01:27 | `t1a-f9b-jobposting-write-boundary-hardening` | (same) | `cd316966` (impl commit) | `vitest.cmd run --config vitest.unit.config.ts` | 0 | **3611/0/9** (219 files) | `terminals/670369.txt` | **SUPERSEDED_PRE_FIX (chạy sau impl commit, trước HANDOFF commit; cùng semantic SHA — kết quả giữ nguyên)** |
| 12 | 670370 | 14:09:30 | 14:11:43 | (same) | (same) | `cd316966` (impl commit) | `timeout 120; vitest.cmd run --config vitest.unit.config.ts` (re-run) | 0 | **3611/0/9** (219 files) | `terminals/670370.txt` | **SUPERSEDED_PRE_FIX (re-run tại cùng impl SHA; cùng kết quả)** |
| 13 | **670371** | 14:34:19 | 14:34:50 | `t1a-f9b-jobposting-write-boundary-hardening` | (same) | `e018dd0a` (chưa có `cd316966`) | `vitest.cmd run --config vitest.integration.config.ts tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` | **1** | **11/6/0** (1 file, 17 tests) | `terminals/670371.txt` | **CURRENT_FAILURE (test file chưa tồn tại tại SHA này; xem mục E + F + G)** |
| 14 | **670372** | 14:35:31 | 14:36:02 | (same) | (same) | `e018dd0a` (chưa có `cd316966`) | (cùng command, retry) | **1** | **12/5/0** (1 file, 17 tests) | `terminals/670372.txt` | **CURRENT_FAILURE (cùng điều kiện như 670371; xem mục E + F + G)** |

**Cột HEAD xác minh:**
- `git log --before='2026-10-03T15:21:00+07:00' --after='2026-10-03T15:00:00+07:00'` → `cd728490` (15:00 ICT, không thuộc F9-B branch).
- `git log --before='2026-10-03T21:35:00+07:00'` → `e018dd0a0b2df53168f3821b682478c7bb56b432` (F9-B planning/control delta, 20:46 ICT, **là commit F9-B mới nhất TRƯỚC 21:35 ICT**).
- `git ls-tree -r e018dd0a -- tests/db/` → KHÔNG có `p1a06-f9b-jobposting-write-boundary.integration.test.ts`. Test file chỉ xuất hiện từ `cd316966` (22:20 ICT).
- `git ls-tree -r cd316966 -- tests/db/` → `dd1d28ae68b104b4bda3ccda6ee380db22d0851e tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` + `72711282361143da9e7b88e6863e81f9ae1a2ea1 tests/db/p1a06-f9b-race-helper.ts`.

**Bằng chứng SHA đầy đủ (40-char):**

```
867f8882ead9d892e65c90ae1daf34d8bb8a090c   <- HEAD tại reconciliation
cd31696601ac9c6ce37c86b2594e9c53dd34791c   <- Implementation SHA (theo HANDOFF §0)
e018dd0a0b2df53168f3821b682478c7bb56b432   <- F9-B planning/control delta (HEAD tại 21:35 ICT khi 670371/670372 chạy)
1b9bbd9f809e2251b501c288bd3d63179fcb4ee7   <- F9 X5 docs/evidence freeze (baseline)
0d38042f7ccc41fafd12cb11de8e0d1fd3ee5c26   <- F9 X4 (predecessor impl)
cd728490f249c6e6207890f5471e2dd22ef2bd9c   <- Operational workflow debt (HEAD tại 15:00 ICT)
```

`git rev-parse cd316966` → resolves tại F9-B worktree (không phải typo). `git merge-base HEAD cd316966` → `cd316966`. HEAD = `cd316966` + 1 commit (HANDOFF-only).

---

## D. Prisma gate tại exact final HEAD (867f8882)

Câu lệnh canonical theo HANDOFF EV-11: `npx prisma validate` (claim: PASS).

### D.1 Thực thi bằng local pinned binary (canonical cho repo)

```
cwd: C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening
HEAD: 867f8882ead9d892e65c90ae1daf34d8bb8a090c
$env:DATABASE_URL  = postgresql://ci:ci@localhost:5432/ci_dummy
$env:DATABASE_URL_ADMIN = postgresql://ci:ci@localhost:5432/ci_dummy
Command: .\node_modules\.bin\prisma.cmd -v
Exit:   0
Output:
  prisma                  : 5.22.0
  @prisma/client          : 5.22.0
  Computed binaryTarget   : windows
  Operating System        : win32
  Architecture            : x64
  Node.js                 : v24.19.0
  Query Engine (Node-API) : libquery-engine 605197351a3c8bdd595af2d2a9bc3025bca48ea2
  Schema Engine           : schema-engine-cli 605197351a3c8bdd595af2d2a9bc3025bca48ea2
  Schema Wasm             : @prisma/prisma-schema-wasm 5.22.0-44.605197351a3c8bdd595af2d2a9bc3025bca48ea2
  Default Engines Hash    : 605197351a3c8bdd595af2d2a9bc3025bca48ea2
  Studio                  : 0.503.0

Command: .\node_modules\.bin\prisma.cmd validate
Exit:   0
Output:
  Prisma schema loaded from prisma\schema.prisma
  The schema at prisma\schema.prisma is valid 🚀
```

### D.2 Thực thi bằng `npx --no-install prisma validate` (canonical của HANDOFF EV-11)

```
Exit: 0
Output:
  Prisma schema loaded from prisma\schema.prisma
  The schema at prisma\schema.prisma is valid 🚀
```

`npx --no-install` không auto-install, dùng local pinned `prisma 5.22.0`. PASS.

### D.3 Phân loại task 670366 (UNKNOWN_COMMAND)

```
cwd: C:\CodeApp\HrP-worktrees\t1a-f9b-jobposting-write-boundary-hardening
HEAD: e018dd0a
Command: npx prisma validate
Exit: 2
Output (key lines):
  npm warn exec The following package was not found and will be installed: prisma@8.0.0-rc.19
  {"kind":"result","envelope":{"ok":false,"commandId":"","error":
    {"code":"CLI.UNKNOWN_COMMAND","severity":"error","summary":
    "No command registered for `validate`"
```

**Phân loại: SUPERSEDED_PRE_FIX, lý do: misrouted invocation.**

- `npx prisma validate` (không `--no-install`) buộc npm exec tìm `prisma` trong local registry cache; vì `prisma` không có trong local `node_modules/.bin` resolution chain tại cwd này (mặc dù `prisma.cmd` tồn tại — npx tìm theo `package.json#bin` không tìm thấy, có thể do cache resolution của npm 11/Node 24).
- npm exec tự động cài `prisma@8.0.0-rc.19` (release candidate, không phải pinned 5.22.0) — version RC này KHÔNG có subcommand `validate`.
- Task 670366 **không phải failure thực** của Prisma schema; nó là failure của command dispatch. Canonical local binary Prisma 5.22.0 tại HEAD `867f8882` validate OK (D.1).

**ACTION REQUIRED:** HANDOFF EV-11 nên ghi rõ invocation dùng `node_modules/.bin/prisma.cmd` (hoặc `npx --no-install prisma validate`) để tránh npm exec tự cài RC. Đây là handbook documentation lỗi, không phải schema defect.

---

## E. Runtime reproduction — tình trạng

Theo mục E của T0 instruction, cần chạy fresh-process ×3 tại exact final HEAD:

1. F9-B targeted ×3.
2. F9 original ×3.
3. Predecessor DB regressions.
4. Static/required-relation/unit gates.

**Trạng thái hiện tại (reconciliation):**

| Gate | Tình trạng automation evidence tại final HEAD 867f8882 | Hành động |
| --- | --- | --- |
| F9-B synthetic ×3 | **CHƯA CÓ evidence automation-level** trong 670359–670372 tại F9-B worktree. Hai lần chạy thấy được (670371, 670372) đều tại SHA `e018dd0a` (không có test file) và FAIL. | **RE-RUN REQUIRED** tại HEAD `867f8882` ×3 fresh processes. |
| F9 original ×3 | **CHƯA CÓ evidence automation-level** trong 670359–670372 tại F9-B worktree. | **RE-RUN REQUIRED** tại HEAD `867f8882` ×3 fresh processes. |
| Predecessor DB regressions | Chạy trong SIBLING worktree `t1a-f9-hr-staff-jobposting-scope` (HEAD `1b9bbd9f`), KHÔNG tại F9-B worktree. EV-06 của HANDOFF **không match** terminal evidence. | **RE-RUN REQUIRED** tại F9-B worktree HEAD `867f8882`. |
| Required-relation sweep | Chưa thấy evidence trong ledger. | **RE-RUN REQUIRED**. |
| F9-B primitive static guard | Chưa thấy evidence trong ledger. | **RE-RUN REQUIRED**. |
| Authoring unit tests | Chưa thấy evidence trong ledger. | **RE-RUN REQUIRED**. |
| Full unit suite ×3 | Có 670369, 670370 tại HEAD `cd316966` (impl, không phải final), cả hai đều **3611/0/9**. | **1 lần re-run tại HEAD 867f8882** còn thiếu để khẳng định HANDOFF-only commit không phá unit suite. |
| `prisma validate` | Có evidence (D.1, D.2) tại HEAD `867f8882` — **PASS**. | DONE. |
| `tsc --noEmit` | Chưa thấy evidence. | **RE-RUN REQUIRED**. |
| `npm run lint` | Chưa thấy evidence. | **RE-RUN REQUIRED**. |
| `npm run build` | Có 670364 ở SIBLING worktree, KHÔNG tại F9-B worktree. | **RE-RUN REQUIRED** tại F9-B worktree. |

**Zero-residue chưa được xác minh** vì tests chưa chạy lại. Predecessor regression chạy trong sibling worktree có thể đã thay đổi DB state; cần reset posture trước khi reproduce.

---

## F. AC-02 semantics — phân tích

Test `tests/db/p1a06-f9b-jobposting-write-boundary.integration.test.ts` (xem đoạn đầu file ở ledger step):
> AC-02 — Direct DB negative proof (writer + HR_STAFF GUC): cannot UPDATE position_title / position_code / work_location / slots_needed / slots_filled / valid_to / staffing_order_id / arbitrary job_opening_id …

Test gọi Prisma `update()` trực tiếp, **expect throw** (xem lỗi `AssertionError: promise resolved "+0" instead of rejecting` ở 670372). Đây là expectation **throw** (SQL permission error hoặc RLS rejection), KHÔNG phải zero-row fail-closed.

TASK contract F9-B:
- F9-B closes B-01 (column-agnostic UPDATE policy) bằng cách:
  - Drop `hrp_f9_slots_staff_update` (column-agnostic).
  - Drop `hrp_staffing_order_slot_scope` FOR ALL.
  - Recreate narrower role-gated policies `hrp_f9b_slots_manager_select/_insert/_update` — **HR_STAFF không có UPDATE/INSERT policy nào trên `staffing_order_slots`**; mutation path duy nhất là primitive `hrp_f9b_bind_slot_to_opening` (SECURITY DEFINER).
- AC-02 test viết `await writer.staffingOrderSlot.update({...}).rejects.toThrow()` → contract yêu cầu **throw** vì HR_STAFF không có grant/policy nào cho UPDATE trên bảng đó từ connection writer.

**Hai failure mode 670372:**
- `+0` thay vì `reject` ⇒ Prisma `update()` resolves với `count=0` ⇒ tức là **không có error permission**, Prisma chỉ thấy 0 rows affected.
- Có hai khả năng:
  1. RLS USING clause không match cho HR_STAFF context → UPDATE silently no-op (rows visible = 0, không có lỗi). Đây là fail-closed đúng về bảo mật nhưng **không match TASK contract** (contract yêu cầu throw).
  2. Writer connection chưa bind `app.user_id`/`app.role` GUC đúng → RLS context trống → behavior phụ thuộc posture DB.

**Phân loại 670372 AC-02 failures:**

Nếu (1) — TASK contract yêu cầu throw, implementation chưa đáp ứng: **CURRENT_FAILURE_BLOCKED**, cần implementation fix.

Nếu (2) — writer connection posture sai: **CURRENT_FAILURE_BLOCKED**, cần fix posture helper (`set_config('app.user_id', ...)` call sequence).

Cả hai trường hợp đều yêu cầu **chạy lại AC-02 tại HEAD `867f8882` tại worktree F9-B** sau khi sửa, với row-count snapshot chứng minh **affected=0** HOẶC **throw** (chỉ một trong hai theo TASK contract). T0 chưa có đủ thông tin để quyết contract; đề xuất T0/TASK owner confirm:

> Contract: AC-02 phải expect một trong hai — (a) SQL permission error (throw), hoặc (b) RLS fail-closed với affected=0 + protected columns byte/value unchanged + no side effects.

Nếu (b) được chấp thuận, test phải được sửa để:
- assert affected = 0 (không reject);
- protected columns snapshot qua admin connection phải byte/value unchanged;
- assert zero audit/outbox/orphan side effects;
- cross-slot/cross-order/rebind đều fail closed cùng cách.

Nếu (a) giữ nguyên, implementation phải đáp ứng throw (writer connection cần `app.user_id` GUC đúng để RLS USING match thì 0 rows; để throw phải cần explicit policy DENY hoặc revoke grants hoàn toàn cho HR_STAFF trên table).

**T0 chưa tự ý chọn (a) hay (b) — đề xuất T0 owner xem lại TASK contract và quyết trước khi sửa test hay sửa implementation.**

---

## G. AC-03 race — phân tích

Test AC-03 chạy `runRevokeBeforeCreateTwoConnectionRace()` (xem helper `tests/db/p1a06-f9b-race-helper.ts`, blob `72711282361143da9e7b88e6863e81f9ae1a2ea1`, introduced tại `cd316966`).

True two-connection race phải chứng minh:
- revoker giữ canonical order advisory lock;
- creator thực sự blocked (pg_locks overlap);
- revoke commit thành công;
- post-lock creator re-read thấy `REVOKED`;
- typed result đúng contract;
- assignment cuối cùng vẫn `REVOKED`, không phải null;
- zero JobOpening/JobPosting/slot-binding side effects.

Failure `670371`:
> AssertionError: expected null to be 'REVOKED' ... ❯ ...test.ts:610:56
> expect(result.evidence.rowCounts.assignmentStatus).toBe('REVOKED');

State cuối = `null` thay vì `REVOKED` ⇒ assignment row bị **mất** chứ không phải bị flip sang `REVOKED`. Có thể:
- revoke path dùng `delete` thay vì `update` (không match contract);
- hoặc admin snapshot đọc từ connection đã bị cleanup;
- hoặc `assignmentStatus` snapshot helper đọc sai cột.

Cũng cần lưu ý: failure xảy ra tại HEAD `e018dd0a` (không có `p1a06-f9b-race-helper.ts` vì file chỉ xuất hiện từ `cd316966`). Vậy test file tại `e018dd0a` thực ra là gì? Có thể nó là test file từ một branch khác (vd từ sibling worktree tạm thời checkout vào F9-B) hoặc uncommitted working tree state. Cần xác minh `git status` tại thời điểm 21:35 ICT (reflog đã ghi `HEAD@{20:37:23}` = working-tree state, gợi ý có uncommitted changes).

**Phân loại 670371 AC-03 failure:**

- Test file và race helper **không tồn tại** tại `e018dd0a`; task 670371 chạy với một test file "ngoài tree" hoặc "uncommitted working-tree state". Không thể khẳng định test file đó có phải version cuối cùng tại `cd316966` hay không.
- Tuy nhiên, nội dung failure (`null` thay vì `REVOKED`) là **về contract**: post-revoke admin snapshot phải thấy assignment status = `REVOKED`, không phải row bị xóa/mất. Đây là vấn đề **application-side race-fix logic** (HANDOFF §1.1 mô tả `createOrReuseJobOpeningForSlot` distinguish canonical revoke error vs binding collision).

**T0 conclusion: AC-03 failure là CURRENT_FAILURE_BLOCKED** — cần reproduce tại HEAD `867f8882` với test file version mới nhất (`dd1d28ae...` test + `72711282...` helper) để phân biệt hai khả năng:
- (i) test file cũ (pre-`cd316966`) đang chạy với logic application mới → expect `REVOKED` nhưng code path mới trả về `null` (đã bị remove/cleanup).
- (ii) test file mới (post-`cd316966`) chạy với logic application cũ (pre-`cd316966`) → thiếu primitive mới, fallback về pre-`cd316966` revoke path không preserve assignment row.

Cả hai đều yêu cầu **re-run tại HEAD `867f8882`** với cả test file và implementation là version mới nhất.

---

## H. Final control state

| Field | Recommended value (T0 reconciliation) |
| --- | --- |
| Status | `CHANGES_REQUIRED` (giữ verdict T0 handback) |
| Frozen delivery | `NO` |
| Canonical gates | `FAIL` (chưa có runtime reproduction tại exact final HEAD `867f8882`) |
| Audit eligibility | `NOT_ELIGIBLE` |
| Next gate | `T0_RUNTIME_REPRODUCE` |

**Lý do giữ CHANGES_REQUIRED:**
1. Appended failures (670366, 670371, 670372) **chưa được phủ nhận** bằng runtime reproduction tại exact final HEAD.
2. `prisma validate` PASS tại final HEAD nhưng **cách invocation sai** trong HANDOFF EV-11 (cần dùng local binary hoặc `npx --no-install`); handbook documentation lỗi.
3. Predecessor regression evidence (task 670361) chạy trong **sibling worktree** `t1a-f9-hr-staff-jobposting-scope`, không phải F9-B worktree — EV-06 của HANDOFF không match terminal evidence.
4. AC-02 và AC-03 chưa được re-run tại HEAD `867f8882` để phân biệt test-version vs implementation-version.

**Điều kiện READY_FOR_AUDIT (per mục H):**
- Tất cả canonical runs tại exact final HEAD `867f8882` PASS;
- Evidence package không còn kết luận mâu thuẫn;
- Một trong hai contract quyết được cho AC-02 (throw hoặc zero-row fail-closed) và test code match.

---

## I. Handoff correction

Final HANDOFF/report **phải tách** rõ ba phần theo mục I:

1. **Historical failed attempts** — tasks 670366, 670371, 670372; predecessor regression ở sibling worktree.
2. **Corrections applied** — phân loại SUPERSEDED_PRE_FIX (670361, 670364, 670369, 670370) vs CURRENT_FAILURE (670366 misrouted, 670371/670372 pre-impl).
3. **Canonical final results** — Prisma validate PASS tại `867f8882` (D.1, D.2). Tất cả gates khác (F9-B ×3, F9 ×3, predecessor regressions, tsc/lint/build) **CHƯA CÓ** evidence tại exact final HEAD.

**Appended automation summary không được phủ định final verdict**: appended section là một ledger row, không phải verdict. Verdict cuối cùng phải do runtime reproduction tại exact final HEAD quyết.

---

## J. Action items cho T0 owner trước khi re-run

1. **Quyết AC-02 contract** (mục F): throw hay zero-row fail-closed? Cần TASK owner ký.
2. **Re-run Prisma validate tại HEAD `867f8882`** — đã xong (D.1, D.2), kết quả PASS.
3. **Sửa HANDOFF EV-11 invocation** từ `npx prisma validate` sang `node_modules/.bin/prisma.cmd validate` (hoặc `npx --no-install prisma validate`).
4. **Tái tạo F9-B synthetic ×3 tại HEAD `867f8882`** với fresh process, fresh synthetic DB posture, không reuse residue từ sibling worktree. Mỗi run cần: full HEAD SHA, writer/admin posture, test count, skipped count, zero-residue check, run identifier.
5. **Tái tạo F9 original ×3 tại HEAD `867f8882`** trong cùng điều kiện.
6. **Tái tạo predecessor DB regressions tại F9-B worktree HEAD `867f8882`** (KHÔNG cite evidence từ sibling worktree).
7. **Tái tạo tsc/lint/build/unit suite tại HEAD `867f8882`**.
8. **Sau khi tất cả PASS, sửa HANDOFF** để loại bỏ ambiguity về predecessor worktree (ghi rõ EV-06 chạy tại worktree nào, tại SHA nào) và cập nhật execution ledger thành CANONICAL_FINAL.

---

**STOP. Hand back to T0.** No Tier 3, no PR/merge/deploy, no UI/Mốc 2/Mốc 3. No amend/reset/rebase/force-push.
