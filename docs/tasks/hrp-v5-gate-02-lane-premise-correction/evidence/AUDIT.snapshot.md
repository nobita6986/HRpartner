# AUDIT — hrp-v5-gate-02-lane-premise-correction

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-gate-02-lane-premise-correction` |
| Work type | `CODE` |
| Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | Tier 1 giao `/audit` sau khi Tier 2 ghi `READY_FOR_AUDIT` ở `HANDOFF.md` round `1` |
| Round closes when | Tier 1 ghi Resolution vào `TASK.md`. Tier 3 không sửa mã, không sửa contract, không commit, không push |
| Auditor context | Tier 3 độc lập. Đã đọc `TASK.md` `v1.2` và `HANDOFF.md` round `1`, rồi TỰ chạy lại từng phép đo bằng lệnh của mình trên cùng bản gate. Không một con số nào trong bản này được sao từ `HANDOFF.md` |
| Baseline | HEAD `31625c4`; nhưng `gate-lib.ps1` và `verify-handoff.ps1` KHÔNG có ở HEAD, nên baseline THẬT của hai tệp là dấu tay blob `EV-06`: gate-lib `43ada847`, verify-handoff `3997dd4f`, verify-audit `2520a48d`. `git log --oneline 31625c4..HEAD` trả `0` dòng theo `R-01`, nên phạm vi thực đo ở staged cộng dirty |
| Artifacts under audit | Hai Module: `.ai-pipeline/scripts/gate-lib.ps1` (`6daa689a`, `469` dòng — chứa predicate `Test-CellUsesNonCanonicalLane`) và `.ai-pipeline/scripts/verify-gates.selftest.ps1` (`a6a7faea`, `675` dòng). Cộng hai chuỗi thông điệp ở `§4.2`: `H-08` trong `verify-handoff.ps1` (`e1af8549`) và `S-11` trong `verify-audit.ps1` (`e1edaeba`), và `18` path dưới thư mục task này |
| Independence | Đã xác nhận. Tier 3 chỉ ghi `AUDIT.md` và tệp `a2-*` dưới `evidence/` của task này; `0` tệp mã, `0` tệp contract, `0` tệp gate bị Tier 3 chạm |
| Gate fingerprint pre-round | `gate-lib.ps1` `6daa689a` `469`, `verify-task.ps1` `e36b83df` `302`, `verify-handoff.ps1` `e1af8549` `341`, `verify-audit.ps1` `e1edaeba` `636`, `verify-pipeline.ps1` `1348bffe` `106` — `evidence/a2-00-fingerprint-pre.txt` |
| Gate fingerprint post-round | Cả `5` hash giống hệt bản pre-round. Dụng cụ chấm điểm KHÔNG dịch trong vòng này, nên mọi phán xét dưới đây đứng trên một bản gate — `evidence/a2-00-fingerprint-post.txt` |
| Standing tree condition | Bản giao Tier 2 khai ở `HANDOFF.md` §4 là gate-lib `6daa689a`, verify-handoff `e1af8549`, verify-audit `e1edaeba`, selftest `a6a7faea` — cả bốn KHỚP cây hiện tại, nên gate-02 là người ghi CUỐI và không có trôi hậu-bàn-giao cho gate-02 |
| Audit time | `2026-09-05` |

## 1. Findings

### AUD-201 — `AC-05` là phép KHÔNG-DƯƠNG-TÍNH-GIẢ, không phải phép chứng minh sự tha trên nhánh `S-11` (P3)

`AC-05` chạy cổng audit trên bản audit round 1 của rf-06 và đòi `0` token `S-11`. Tôi đo được đúng `0` dòng `S-11`, exit `2`. NHƯNG `11` lỗi mà rf-06 nhả ra là `9` dòng `S-19` cộng `1` nhóm `S-18` cộng `1` `S-10` — toàn defect ROW-IDENTITY của chính rf-06, KHÔNG có `S-11`. Nghĩa là bản audit rf-06 không hề chứa ô nhắc lane trần đủ để predicate CŨ cắn; `S-11` im cả trước lẫn sau bản vá. Vậy `AC-05` chứng minh "không đỏ oan", không chứng minh "đã tha một ô từng bị cắn". Sự THA thật trên artifact thật vẫn được chứng minh, nhưng qua `AC-02` (predicate DÙNG CHUNG theo `DEC-01`, nhánh `H-08`: `HANDOFF.md` của gate-02 mang `1` ô lane trần và cổng tha nó, `0` `H-08`) cộng ca selftest tha (`audit PASS S-11` khi `vitest.config.ts` khoá). Riêng nhánh `S-11` tha một ô THẬT thì chỉ có fixture chứng, chưa có artifact thật.

- **Bản chất:** lời văn `AC-05` của Tier 1 nói mạnh hơn thứ nó đo được; KHÔNG phải defect bản giao. Tier 2 đã khai đúng ở `LIM-06`.
- **Đường đóng:** bump spec — hoặc sửa lời `AC-05` thành "không đỏ oan (no-false-positive)", hoặc thêm một fixture rf-artifact thật có ô lane trần để nhánh `S-11` tha được đo trên artifact. KHÔNG mở execution round: bản giao đúng.

### AUD-202 — Comment cũ ở `verify-handoff.ps1:18` vẫn mang tiền đề đã bị bác, dưới dạng lời văn (P3)

`RQ-04` buộc THÔNG ĐIỆP của `H-08` và `S-11` bỏ khẳng định vô điều kiện về `.env`; ba chuỗi thông điệp đã sửa đúng (`AC-06`). Nhưng dòng comment tiêu đề nhóm ở `verify-handoff.ps1:18` vẫn đọc `non-canonical test lane that reads production DATABASE_URL (go-live-01 BLK-01)`. Đây là COMMENT, không phải chuỗi thông điệp, nên nằm NGOÀI phạm vi `RQ-04` và `§4.2`; Tier 2 để nguyên là đúng luật và đã khai `LIM-11`.

- **Bản chất:** dư nợ lời văn ngoài phạm vi, KHÔNG phải defect bản giao.
- **Đường đóng:** ghi nợ cho một contract sau (cùng họ `Q-02`). KHÔNG mở execution round.

## 2. Acceptance Verification

| AC | Verdict | Phép đo Tier 3 tự chạy lại + evidence |
|---|---|---|
| AC-01 | PASS | `git hash-object` cho gate-lib ra `43ada847` và verify-handoff ra `3997dd4f`, KHỚP `EV-06` lúc mở; verify-audit lệch `2520a48d` sang `b6854802`, `git diff --numstat` ra `98 0` (thêm-không-bớt, vùng S-17/18/19 của anh em gate-01, HANDOFF anh em blob `0959c235` có thật), phân loại cause-A `DEC-09` nhánh hai rồi chạy tiếp — `evidence/a2-01-causeA.txt` |
| AC-02 | PASS | `verify-handoff.ps1` trên `HANDOFF.md` gate-02 (mang `1` ô lane trần) dưới `vitest.config.ts` thật của repo: `0` dòng `H-08`, exit `0`, `[OK] H-04` — sự tha đo được trên artifact thật — `evidence/a2-02-verify-handoff.txt` |
| AC-03 | PASS | `verify-gates.selftest.ps1`: ca nhánh-chặn `handoff FAIL H-08 lane tran + vitest.config.ts KHONG khoa bien DB thi VAN DO` in `[ ok ]` — cấu hình không khoá thì cổng vẫn đỏ `H-08` — `evidence/a2-07-selftest.txt` |
| AC-04 | PASS | `verify-gates.selftest.ps1`: ca fail-closed `handoff FAIL H-08 lane tran + VANG tep vitest.config.ts thi VAN DO` in `[ ok ]` — vắng tệp cấu hình thì cổng vẫn đỏ `H-08` — `evidence/a2-07-selftest.txt` |
| AC-05 | PASS | `verify-audit.ps1` trên bản audit round 1 của rf-06: `0` dòng `S-11`, exit `2`; `11` lỗi còn lại là `9` `S-19` cộng `1` `S-18` cộng `1` `S-10`, tuyệt không `S-11` — lời văn nói mạnh hơn phép đo, xem AUD-201 — `evidence/a2-05-verify-audit-rf06.txt` |
| AC-06 | PASS | Trích dòng `203` của `verify-handoff.ps1` và hai dòng `S-11` của `verify-audit.ps1`: cả ba nêu tên `vitest.config.ts` (`1` cộng `2`), `0` chuỗi khẳng định vô điều kiện cũ — `evidence/a2-06-messages.txt` |
| AC-07 | PASS | `verify-gates.selftest.ps1` ra `cases: 39 total (7 green, 32 red), failures: 0`, exit `0`; `39` vượt sàn `35` và hơn mốc `STEP-02` `37` đúng `2` ca — `evidence/a2-07-selftest.txt` |
| AC-08 | PASS | Trích thân predicate dòng `358` tới `370` của `gate-lib.ps1` rồi `grep -c -F`: `.env` `0`, `Invoke-WebRequest` `0`, `npx` `0`, `npm` `0` — predicate tĩnh, không tác dụng phụ — `evidence/a2-08-no-side-effect.txt` |
| AC-09 | PASS | `git diff --cached --name-only` xác nhận `16` tệp evidence trong index, rồi quét mẫu scheme kết nối Postgres trả `0` — không chuỗi connection string, `R-02` giữ — `evidence/a2-09-no-sentinel.txt` |
| AC-10 | PASS | `git diff --cached --name-only` ra `343` path, `18` dưới slug gate-02; dấu chân gate-02 là predicate gate-lib cộng `6` ca lane selftest cộng thông điệp `H-08`/`S-11`, còn `2` path `src/` staged là của lane khác nên loại trừ — `evidence/a2-10-scope.txt` |
| AC-11 | PASS | `verify-task.ps1` exit `0` `RESULT: PASS`, rồi `verify-handoff.ps1` exit `0` `RESULT: PASS` với `[OK] H-04` xác nhận §3 mở bằng verify-task PASS — `evidence/a2-11-verify-task.txt` |

### Tier 3 mandatory checklist

| # | Trạng thái | Bằng chứng |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, `109` tệp `1669` test — `evidence/a2-c01-test-unit.txt` |
| C-02 | DONE | `npm run typecheck` (tsc noEmit) exit `0`, `0` diagnostic — `evidence/a2-c02-typecheck.txt` |
| C-03 | SKIP | Gate-02 chạm `0` tệp .ts và `0` route; footprint là bốn tệp PowerShell nên không có bề mặt HTTP để soi — `evidence/a2-10-scope.txt` |
| C-04 | SKIP | `0` đường Prisma trong footprint gate-02 nên không có drift schema để đối chiếu — `evidence/a2-10-scope.txt` |
| C-05 | SKIP | `0` route ghi mới; không handler mutation nào cần khoá idempotency hay outbox — `evidence/a2-10-scope.txt` |
| C-06 | SKIP | `0` migration và `0` policy trong footprint gate-02 nên không có bề mặt RLS để kiểm — `evidence/a2-10-scope.txt` |
| C-07 | DONE | `git diff --cached --name-only` `343` path nhưng `0` path staged trong vùng cấm của gate-02; gate-02 tự đưa hai Module cộng `18` path slug — `evidence/a2-10-scope.txt` |
| C-08 | DONE | `verify-gates.selftest.ps1` mang `6` ca lane (hàng rào có mã kiểm tự động); AC-03/04/07 xác nhận chúng chạy `39` ca `0` fail — `evidence/a2-07-selftest.txt` |
| C-09 | DONE | `verify-task.ps1` exit `0` `RESULT: PASS` xác nhận contract giao được — `evidence/a2-11-verify-task.txt` |
| C-10 | DONE | `git log --oneline 31625c4..HEAD` trả `0` (vòng này không commit theo R-01); phạm vi đo trên `343` path staged — `evidence/a2-10-scope.txt` |

## 3. Scope

- **Trong phạm vi (dấu chân Tier 2 gate-02):** `.ai-pipeline/scripts/gate-lib.ps1` (predicate `Test-CellUsesNonCanonicalLane` đọc `vitest.config.ts`, fail-closed) và `.ai-pipeline/scripts/verify-gates.selftest.ps1` (`6` ca lane), cộng chuỗi thông điệp `H-08` ở `verify-handoff.ps1:203` và hai chuỗi `S-11` ở `verify-audit.ps1:209` và `:402`, cộng `18` path dưới `docs/tasks/hrp-v5-gate-02-lane-premise-correction/`.
- **Ngoài phạm vi (luồng khác trong cùng index):** `verify-audit.ps1` cũng mang marker `S-18`/`S-19` của anh em gate-01, và `verify-gates.selftest.ps1` mang `4` ca của gate-01 — tôi tách bằng marker nội dung, không quy theo tên tệp. Hai path `src/shared/toolchain/*.static.test.ts` staged là của lane rf-05/rf-06. `AC-10` loại trừ đúng các vùng này.
- **Tier 3 tự chạm:** chỉ `AUDIT.md` này và tệp `a2-*` dưới `evidence/`. `0` tệp mã, `0` contract, `0` tệp gate bị Tier 3 sửa.

## 4. Independent Evidence

| # | Đo gì | Lệnh Tier 3 | Kết quả | Evidence |
|---|---|---|---|---|
| E-1 | Dấu tay gate trước round | `git hash-object` năm tệp gate | verify-audit `e1edaeba`, gate-lib `6daa689a`, verify-task `e36b83df`, verify-handoff `e1af8549`, verify-pipeline `1348bffe` | `evidence/a2-00-fingerprint-pre.txt` |
| E-2 | Dấu tay gate sau round | `git hash-object` năm tệp gate | Cả `5` hash giống pre-round, dụng cụ không dịch | `evidence/a2-00-fingerprint-post.txt` |
| E-3 | Trôi cause-A của verify-audit | `git diff --numstat 2520a48d b6854802` | `98 0`, thêm-không-bớt, HANDOFF anh em gate-01 blob `0959c235` có thật | `evidence/a2-01-causeA.txt` |
| E-4 | Predicate tha cấu hình thật, chặn khi vắng tệp | dot-source `gate-lib.ps1` rồi gọi `Test-CellUsesNonCanonicalLane` | lock matches `True`, ô lane trần với config thật trả `False` (tha), với gốc rỗng trả `True` (chặn) | `evidence/a2-01-predicate-live.txt` |
| E-5 | `H-08` im trên gate-02, `S-11` im trên rf-06 | `verify-handoff.ps1` và `verify-audit.ps1` | `0` `H-08` exit `0`; `0` `S-11` exit `2` | `evidence/a2-02-verify-handoff.txt` |
| E-6 | Harness bao phủ nhánh tha và nhánh chặn | `verify-gates.selftest.ps1` | `39` ca `0` fail; ca chặn và ca fail-closed đều `[ ok ]` | `evidence/a2-07-selftest.txt` |
| E-7 | Thông điệp nêu `vitest.config.ts`, bỏ tiền đề `.env` | trích `verify-handoff.ps1` và `verify-audit.ps1` | `vitest.config.ts` `1` cộng `2`, chuỗi cũ `0` | `evidence/a2-06-messages.txt` |
| E-8 | Predicate không tác dụng phụ | trích `gate-lib.ps1` `358`-`370` rồi `grep -c -F` | `.env`, `Invoke-WebRequest`, `npx`, `npm` đều `0` | `evidence/a2-08-no-side-effect.txt` |
| E-9 | Cổng contract và bàn giao | `verify-task.ps1` và `verify-handoff.ps1` | cả hai exit `0` `RESULT: PASS`, `[OK] H-04` | `evidence/a2-11-verify-task.txt` |

## 5. Coverage Gaps

1. **Trôi sau bàn giao: KHÔNG có cho gate-02.** Bốn blob Tier-2 khai ở `HANDOFF.md` §4 khớp cây hiện tại; gate-02 là người ghi cuối. Hệ quả cho BƯỚC commit: phải neo blob hiện tại và dùng `git commit -- <pathspec>` theo `LIM-02`, không `git add -A`, vì `verify-audit.ps1` và `verify-gates.selftest.ps1` dùng chung với gate-01.
2. **AUD-201 — nhánh `S-11` tha một ô THẬT chỉ có fixture chứng.** `AC-05` là no-false-positive trên rf-06; sự tha trên artifact thật đo được ở nhánh `H-08` (`AC-02`), còn nhánh `S-11` mới có ca selftest. Đóng bằng bump spec, không mở round.
3. **AUD-202 — comment cũ `verify-handoff.ps1:18`.** Ngoài phạm vi `RQ-04` (chỉ chỉnh chuỗi thông điệp), ghi nợ cho contract sau.
4. **LIM-03 — mẫu nhận dạng khoá biến DB hẹp.** Regex tĩnh, một cấu hình khoá theo cách khác vẫn bị chặn oan; nợ ở `Q-01`, KHÔNG nới predicate trong round này.
5. **Quy thuộc footprint là SUY LUẬN.** Ranh giới dấu chân dựng từ marker nội dung trên một index dùng chung, không có bằng chứng dương về rò rỉ. Nếu committer dùng `git add -A` thì ranh giới vỡ — rủi ro của bước commit, ngoài gate-02.
6. **WARN S-16 dự kiến khi chấm bản này.** verify-audit tự cảnh báo staged-paths vì cây dirty; đó là WARN không phải FAIL, ghi nhận ở đây và KHÔNG dập.

## 6. Verdict

**Verdict:** `CONDITIONAL`

- **Đếm AC:** `11` PASS, `0` PARTIAL, `0` FAIL, `0` BLOCKED, `0` N/A. Không AC nào mà HANDOFF khai `ENV_BLOCKED` lại được ghi PASS.
- **Đếm checklist:** `6` DONE, `4` SKIP (C-03..C-06, mỗi cái kèm lý do đo được), `0` FAIL.
- **Đếm finding:** `0` P0, `0` P1, `0` P2, `2` P3 (AUD-201, AUD-202).
- **Lý do CONDITIONAL:** bản giao Tier 2 đúng ở mọi mặt đo được — predicate đọc `vitest.config.ts` và THA khi cấu hình khoá biến DB (đo trên artifact thật qua `AC-02`), CHẶN khi cấu hình không khoá (`AC-03`) và khi vắng tệp (`AC-04`, fail-closed), thông điệp bỏ tiền đề `.env` và nêu tên tệp cấu hình (`AC-06`), harness thêm `2` ca phủ cả hai nhánh (`AC-07`), predicate không tác dụng phụ (`AC-08`), không rò connection string (`AC-09`). Mọi AC PASS trên đúng điều kiện của nó. Hai điểm chưa trọn đều là LỜI VĂN: `AC-05` nói mạnh hơn phép đo (AUD-201) và một comment cũ ngoài phạm vi còn mang tiền đề đã bác (AUD-202). Cả hai đóng bằng bump spec hoặc ghi nợ; KHÔNG có defect thật nào mở được execution round. Verdict là CONDITIONAL chờ Tier 1 xử hai P3 rồi Resolution.

## 7. Re-audit Trace

- **Round audit:** `1`. Không có round audit trước, nên không có delta so bản audit cũ.
- **Đã tự chạy lại:** năm phép in dấu tay gate (E-1, E-2), numstat cause-A trên blob (AC-01), verify-handoff trên gate-02 (AC-02), selftest hai nhánh cộng tổng ca (AC-03/04/07), verify-audit trên rf-06 (AC-05), trích ba chuỗi thông điệp (AC-06), trích thân predicate rồi grep (AC-08), quét sentinel dưới evidence (AC-09), quét scope staged (AC-10), verify-task cùng verify-handoff (AC-11), cộng C-01 test:unit và C-02 typecheck.
- **Kỷ luật dụng cụ:** dấu tay năm tệp gate pre-round bằng post-round từng hash, nên toàn bộ phán xét đứng trên MỘT bản gate `6daa689a` / `a6a7faea` / `e1edaeba` / `e1af8549`. Trôi duy nhất là verify-audit `2520a48d` sang `b6854802` lúc mở, đã truy nguyên cause-A của anh em gate-01 và không chạm predicate lane.
- **Con số nào của tôi cũng từ lệnh tôi tự chạy**, không sao từ HANDOFF; mọi exit code trích trên đây là mã tôi tự đọc lại.

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.





