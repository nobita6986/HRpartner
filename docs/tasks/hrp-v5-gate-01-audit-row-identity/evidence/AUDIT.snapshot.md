# AUDIT — hrp-v5-gate-01-audit-row-identity

## 0. Audit Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-gate-01-audit-row-identity` |
| Work type | `CODE` |
| Audit type | `CODE_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `1` |
| Audit round | `1` |
| Round opened by | Tier 1 giao `/audit` sau khi Tier 2 ghi `READY_FOR_AUDIT` ở `HANDOFF.md` round `1` |
| Round closes when | Tier 1 ghi Resolution vào `TASK.md`. Tier 3 không sửa mã, không sửa contract, không commit, không push |
| Auditor context | Tier 3 độc lập. Đã đọc `TASK.md` `v1.2` và `HANDOFF.md`, rồi TỰ chạy lại từng phép đo bằng lệnh của mình trên cùng bản gate. Không một con số nào trong bản này được sao từ `HANDOFF.md` |
| Baseline | `31625c4bb4ced393661684c2c8cb96f1e42bf054` là HEAD lúc mở và lúc đóng; `git log --oneline 31625c4..HEAD` trả `0` dòng theo `R-01`, nên phạm vi thực đo ở staged cộng dirty. Baseline THẬT của hai Module gate-01 là dấu tay `EV-06`: verify-audit `2520a48d`, gate-lib `43ada847`, verify-handoff `3997dd4f`, verify-task `e36b83df`, verify-pipeline `1348bffe` |
| Artifacts under audit | `.ai-pipeline/scripts/verify-audit.ps1` — cây làm việc bằng index `e1edaebac456da16cb618dca2607e7f46b1c4358`, `636` dòng — và `.ai-pipeline/scripts/verify-gates.selftest.ps1` — `a6a7faeaf65dc490b0f597d21877230f4a8fc45e`, `675` dòng. Đây là HAI Module gate-01 khai, cộng `14` path dưới thư mục task này |
| Independence | Đã xác nhận. Tier 3 chỉ ghi `AUDIT.md` và tệp `a1-*` dưới `evidence/` của task này; `0` tệp mã, `0` tệp contract, `0` tệp gate bị Tier 3 chạm |
| Gate fingerprint pre-round | `gate-lib.ps1` `6daa689a` `469` dòng, `verify-task.ps1` `e36b83df` `302`, `verify-handoff.ps1` `e1af8549` `341`, `verify-audit.ps1` `e1edaeba` `636`, `verify-pipeline.ps1` `1348bffe` `106` — `evidence/a1-00-fingerprint-pre.txt` |
| Gate fingerprint post-round | Cả `5` hash giống hệt bản pre-round. Dụng cụ chấm điểm KHÔNG dịch trong vòng này, nên mọi phán xét dưới đây đứng trên một bản gate — `evidence/a1-00-fingerprint-post.txt` |
| Standing tree condition | Bản giao Tier 2 khai ở `HANDOFF.md` §4 là verify-audit `b6854802` và selftest `9e1feb05`. Cây hiện tại đã trôi tới `e1edaeba` và `a6a7faea`: khoảng trôi verify-audit `b6854802 -> e1edaeba` là `4 4`, cả bốn dòng là lời văn `S-11` do lane `gate-02` viết lại, `0` dòng chạm `S-17`/`S-18`/`S-19`. Đây là trôi cause-A mà `DEC-08` gate-01 đã lường trước |
| Audit time | `2026-09-05` |

## 1. Findings

### AUD-101 — Phương pháp của `AC-05` mâu thuẫn với chính field Baseline của contract (P3)

`AC-05` muốn khẳng định: gate-01 KHÔNG nới `S-17`, chỉ thêm một khối comment. Nội dung ấy ĐÚNG và tôi đo được. Nhưng phương pháp `AC-05` viết ra là `git diff --cached -- .ai-pipeline/scripts/verify-audit.ps1`, tức so index với HEAD `31625c4`. HEAD ấy có TRƯỚC cả bộ gate, nên lệnh này quy toàn bộ khối `S-17` (do luồng nền viết) thành "dòng mới thêm" và trả `569` dòng `+`, không tách được phần gate-01 chạm. Đo trên Baseline mà chính contract chỉ định — blob `EV-06` `2520a48d` — thì bản giao là THÊM-KHÔNG-BỚT: `git diff --numstat 2520a48d b6854802` = `98 0`. Vì `0` dòng bị xoá, không câu `S-17` nào có thể đã đổi; hai câu `Add-GateWarn`/`Add-GateOk 'S-17'` giống nhau từng ký tự giữa hai blob, chỉ số dòng dịch xuống vì `8` dòng comment `DEC-02` chèn phía trên.

- **Bản chất:** defect lời văn của Tier 1 (phương pháp chọn sai mốc), KHÔNG phải defect bản giao của Tier 2.
- **Đường đóng:** bump spec — sửa phương pháp `AC-05` sang `git diff --numstat 2520a48d <blob giao>` (hoặc `git cat-file -p` rồi so khối `S-17`). KHÔNG mở execution round: bản giao đã đúng, không có gì cho Tier 2 sửa.

### AUD-102 — Lời văn `AC-09` nói cổng "không in `S-18`", nhưng cổng in `S-18` dưới dạng `[OK]` (P3)

Phần dẫn của `TASK.md` viết: trên bản audit sạch, cổng "không in `S-18`". Đo thật trên hai slug đã ACCEPTED: cổng in `[OK]   S-18 12 AC rows are pairwise distinct.` (go-live-16) và `... 18 AC rows ...` (go-live-18). Nó CÓ in `S-18`, chỉ là ở mức `[OK]` chứ không phải `[FAIL]`. Mệnh đề đo được đúng là "không in `[FAIL]` `S-18`/`S-19`", và mệnh đề ấy thoả (`0` và `0` trên cả hai slug).

- **Bản chất:** defect lời văn của Tier 1; hành vi bản giao đúng.
- **Đường đóng:** bump spec — sửa lời `AC-09` thành "không in `[FAIL]` `S-18`/`S-19`". KHÔNG mở execution round.

## 2. Acceptance Verification

| AC | Verdict | Phép đo Tier 3 tự chạy lại + evidence |
|---|---|---|
| AC-01 | PASS | `git hash-object` cho verify-audit ra `2520a48d` và gate-lib ra `43ada847`, cả hai KHOP `EV-06` lúc mở round nên đi nhánh một của DEC-08 (không lệch), kết luận `NHANH MOT` — `evidence/step01-fingerprint.txt` |
| AC-02 | PASS | `verify-audit.ps1` trên rf-06: đúng một nhóm `[FAIL] S-18 ... AC-01 ... AC-09 (1 such group(s) in section 2)`, exit `2` — `evidence/a1-02-03-rf06-verify-audit.txt` |
| AC-03 | PASS | `verify-audit.ps1` trên rf-06 (cùng lần chạy AC-02): `9` dòng `[FAIL] S-19` cho AC-01 tới AC-09, hàng AC-01 dùng đúng chữ verdict `BLOCKED` một mình — `evidence/a1-02-03-rf06-verify-audit.txt` |
| AC-04 | PASS | `verify-gates.selftest.ps1`: ca `FAIL S-18 ba hàng` khi `3` hàng trùng ra ERROR, ca `PASS S-18 ngưỡng` khi `2` hàng ra WARN qua `-WarnToken`, `failures: 0` — `evidence/a1-06-selftest-run1.txt` |
| AC-05 | PARTIAL | Nội dung đúng: `git diff --numstat 2520a48d b6854802` = `98 0`, `0` dòng xoá nên `0` câu `S-17` đổi, comment `DEC-02` từ `0` lên `1`. NHƯNG phương pháp contract `git diff --cached` trả `569` mâu thuẫn field Baseline `31625c4` — defect lời văn Tier 1, xem AUD-101 — `evidence/a1-05-s17-identity.txt` |
| AC-06 | PASS | `verify-gates.selftest.ps1`: `cases: 39 total (7 green, 32 red), failures: 0`, exit `0`; thoả sàn `39` lớn hơn `35` và `0` fail — `evidence/a1-06-selftest-run1.txt` |
| AC-07 | PASS | `verify-gates.selftest.ps1` chạy hai lần: dòng khác duy nhất giữa run1 và run2 là đường fixture tạm `hrp-gate-selftest`, mọi dòng kết quả ca giống hệt nên harness ổn định — `evidence/a1-07-selftest-run2.txt` |
| AC-08 | PASS | `git hash-object` rf-06 AUDIT.md ra `1212bae7` cả hai lần, `git status` cho `A ` đúng dấu tay contract chờ — `evidence/a1-08-rf06-audit-hash.txt` |
| AC-09 | PASS | `verify-audit.ps1` trên go-live-16 và go-live-18: `0` dòng `[FAIL] S-18` và `0` dòng `[FAIL] S-19`, cổng in `[OK] S-18 12 AC rows` cùng `18 AC rows`, exit `0`. Lời "không in S-18" thiếu chuẩn — xem AUD-102 — `evidence/a1-09-hrp-v5-go-live-16-internal-contrast-focus.txt` |
| AC-10 | PASS | `git diff --cached --name-only` = `341` staged, `14` dưới slug gate-01; verify-audit mang `5` marker gate-01 còn gate-lib và verify-handoff mang marker lane gate-02, verify-delivery-presence mang `15` marker giao — dấu chân Tier 2 gate-01 gói trong `2` Module cộng slug — `evidence/a1-10-scope.txt` |
| AC-11 | PASS | `verify-task.ps1` exit `0` `RESULT: PASS`, `verify-handoff.ps1` exit `0` `RESULT: PASS` với `[OK] H-04` xác nhận §3 mở bằng verify-task PASS — `evidence/a1-11-verify-handoff.txt` |

### Tier 3 mandatory checklist

| # | Trạng thái | Bằng chứng |
|---|---|---|
| C-01 | DONE | `npm run test:unit` exit `0`, `109` tệp `1669` test — `evidence/a1-c01-test-unit.txt` |
| C-02 | DONE | `npm run typecheck` (tsc noEmit) exit `0`, `0` diagnostic — `evidence/a1-c02-typecheck.txt` |
| C-03 | SKIP | Gate-01 chạm `0` tệp .ts và `0` route; footprint là hai tệp PowerShell nên không có bề mặt HTTP để soi — `evidence/a1-10-scope.txt` |
| C-04 | SKIP | `0` đường Prisma trong footprint; `grep -c prisma` trên hai Module trả `0` nên không có drift schema để đối chiếu — `evidence/a1-10-scope.txt` |
| C-05 | SKIP | `0` route ghi mới; không có handler mutation nào cần khoá idempotency hay outbox — `evidence/a1-10-scope.txt` |
| C-06 | SKIP | `0` migration và `0` policy trong footprint gate-01 nên không có bề mặt RLS để kiểm — `evidence/a1-10-scope.txt` |
| C-07 | DONE | `git status --porcelain` `581` dòng nhưng `0` path staged trong vùng cấm của gate-01; gate-01 tự đưa `2` Module cộng `14` path slug — `evidence/a1-10-scope.txt` |
| C-08 | DONE | Khác gate-03: hàng rào mới CÓ mã kiểm tự động; `grep -c` trên selftest cho `4` ca S-18 và S-19, AC-06 xác nhận chúng chạy `39` ca `0` fail — `evidence/a1-06-selftest-run1.txt` |
| C-09 | DONE | `verify-task.ps1` exit `0` `RESULT: PASS` xác nhận contract giao được — `evidence/a1-11-verify-task.txt` |
| C-10 | DONE | `git log --oneline 31625c4..HEAD` trả `0` (vòng này không commit theo R-01); phạm vi đo trên `341` path staged — `evidence/a1-10-scope.txt` |

## 3. Scope

- **Trong phạm vi (dấu chân Tier 2 gate-01):** `.ai-pipeline/scripts/verify-audit.ps1` (thêm S-18, S-19, comment DEC-02) và `.ai-pipeline/scripts/verify-gates.selftest.ps1` (thêm `4` ca), cộng `14` path dưới `docs/tasks/hrp-v5-gate-01-audit-row-identity/`.
- **Ngoài phạm vi (luồng khác trong cùng index):** `gate-lib.ps1` và `verify-handoff.ps1` mang marker lane `gate-02`; `verify-delivery-presence.ps1` mang `15` marker của gate-03; các path Tier-1 và lane khác. `AC-10` khai loại trừ đúng các vùng này, và tôi đối chiếu bằng marker nội dung chứ không suy từ tên tệp.
- **Tier 3 tự chạm:** chỉ `AUDIT.md` này và tệp `a1-*` dưới `evidence/`. `0` tệp mã, `0` contract, `0` tệp gate bị Tier 3 sửa.

## 4. Independent Evidence

| # | Đo gì | Lệnh Tier 3 | Kết quả | Evidence |
|---|---|---|---|---|
| E-1 | Dấu tay gate trước round | `git hash-object` năm tệp gate | verify-audit `e1edaeba`, gate-lib `6daa689a`, verify-task `e36b83df`, verify-handoff `e1af8549`, verify-pipeline `1348bffe` | `evidence/a1-00-fingerprint-pre.txt` |
| E-2 | Dấu tay gate sau round | `git hash-object` năm tệp gate | Cả `5` hash giống pre-round, dụng cụ không dịch | `evidence/a1-00-fingerprint-post.txt` |
| E-3 | S-18 và S-19 bắt hàng đỏ | `verify-audit.ps1` trên rf-06 | `1` nhóm `[FAIL] S-18`, `9` dòng `[FAIL] S-19`, exit `2` | `evidence/a1-02-03-rf06-verify-audit.txt` |
| E-4 | S-17 không bị nới | `git diff --numstat 2520a48d b6854802` | `98 0`, `0` dòng xoá, comment DEC-02 `0` lên `1`, câu emit S-17 trùng ký tự | `evidence/a1-05-s17-identity.txt` |
| E-5 | Harness bao phủ và ổn định | `verify-gates.selftest.ps1` chạy hai lần | `39` ca `0` fail; hai lần chỉ khác đường fixture tạm | `evidence/a1-06-selftest-run1.txt` |
| E-6 | Bản audit sạch không đỏ | `verify-audit.ps1` trên go-live-16 và go-live-18 | `[FAIL] S-18` `0`, `[FAIL] S-19` `0`, `[OK]` `12` và `18` hàng, exit `0` | `evidence/a1-09-hrp-v5-go-live-18-public-surface-hardening.txt` |
| E-7 | Cổng contract và bàn giao | `verify-task.ps1` và `verify-handoff.ps1` | cả hai exit `0` `RESULT: PASS`, `[OK] H-04` | `evidence/a1-11-verify-task.txt` |

## 5. Coverage Gaps

1. **Trôi sau bàn giao (lành).** Cây đã đi từ blob Tier-2 `b6854802` tới `e1edaeba` (`4 4`, toàn lời văn `S-11` của gate-02, `0` dòng chạm S-17/S-18/S-19). Hệ quả cho BƯỚC SAU, không phải cho gate-01: commit bộ gate phải neo blob HIỆN TẠI và dùng `git commit -- <pathspec>` theo `PLN-59` và `LIM-02`, không `git add -A`.
2. **DEV-05 — bốn hàng `S-19` đỏ còn sót là TRUE positive.** Chúng phát trong fixture của các ca harness cũ (S-02, S-04, S-07) và mỗi hàng còn kèm một `S-02` đỏ độc lập; đúng thiết kế, không cần hành động.
3. **Quy thuộc footprint là SUY LUẬN.** Ranh giới dấu chân dựng từ marker nội dung trên một index dùng chung, không có bằng chứng dương về rò rỉ. Nếu committer dùng `git add -A` thay vì `git commit -- <pathspec>` thì ranh giới này vỡ — đó là rủi ro của bước commit, ngoài phạm vi gate-01.
4. **AUD-101 và AUD-102 — lời văn contract lệch phép đo.** Giá trị thực (`98 0`; `[FAIL]` S-18/S-19 bằng `0`) đã đo đúng; đóng bằng bump spec, không mở execution round.
5. **WARN S-16 dự kiến khi chấm bản này.** verify-audit tự cảnh báo staged-paths vì cây dirty `581`; đó là WARN không phải FAIL, ghi nhận ở đây và KHÔNG dập.

## 6. Verdict

**Verdict:** `CONDITIONAL`

- **Đếm AC:** `10` PASS, `1` PARTIAL (AC-05), `0` FAIL, `0` BLOCKED, `0` N/A. Không AC nào mà HANDOFF khai `ENV_BLOCKED` lại được ghi PASS.
- **Đếm checklist:** `6` DONE, `4` SKIP (C-03..C-06, mỗi cái kèm lý do đo được), `0` FAIL.
- **Đếm finding:** `0` P0, `0` P1, `0` P2, `2` P3 (AUD-101, AUD-102).
- **Lý do CONDITIONAL:** bản giao Tier 2 đúng ở mọi mặt đo được — S-18 và S-19 bắt đỏ trên rf-06, không nới S-17, harness bao phủ và ổn định, bản audit sạch không đỏ oan. Điểm duy nhất chưa PASS là AC-05, và nguyên nhân là PHƯƠNG PHÁP do chính Tier 1 viết chọn sai mốc so, không phải khiếm khuyết của Tier 2. Theo doctrine, một AC bất khả đo đúng vì lời văn của Tier 1 là bump spec (PARTIAL sang CONDITIONAL), không phải mở execution round. AC-09 PASS nhưng kèm cùng loại lệch lời văn (AUD-102), cũng đóng bằng bump. Không có defect thật nào mở được round mới, nên verdict là CONDITIONAL chờ Tier 1 bump `AC-05` và `AC-09` rồi Resolution.

## 7. Re-audit Trace

- **Round audit:** `1`. Không có round audit trước, nên không có delta so bản audit cũ.
- **Đã tự chạy lại:** năm phép in dấu tay gate (E-1, E-2), verify-audit trên rf-06 (AC-02/03), numstat blob S-17 trên Baseline EV-06 (AC-05), selftest hai lần (AC-04/06/07), hash-object rf-06 AUDIT (AC-08), verify-audit trên go-live-16 và go-live-18 (AC-09), quét scope staged (AC-10), verify-task cùng verify-handoff (AC-11), cộng C-01 test:unit và C-02 typecheck.
- **Kỷ luật dụng cụ:** dấu tay năm tệp gate pre-round bằng post-round từng hash, nên toàn bộ phán xét đứng trên MỘT bản gate `e1edaeba` và `a6a7faea` và `6daa689a`. Trôi so `HANDOFF.md` §4 đã truy nguyên là lời văn S-11 của gate-02, `0` dòng chạm ba mã kiểm gate-01.
- **Con số nào của tôi cũng từ lệnh tôi tự chạy**, không sao từ HANDOFF; mọi exit code trích trên đây là mã tôi tự đọc lại.

> Đã bàn giao AUDIT.md cho Tier 1; chờ Planner Resolution trong TASK.md.
