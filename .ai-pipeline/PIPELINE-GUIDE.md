# AI Delivery Pipeline — Operating Guide

> Mục tiêu: giao hàng nhanh ở phần ít rủi ro và giữ kiểm soát sâu ở phần có thể gây thiệt hại. Protocol này không gắn với một sản phẩm cụ thể.

## 1. Chuỗi trách nhiệm

| Tier | Trách nhiệm | Không được tự làm thay |
|---|---|---|
| Tier 0 | Chọn hướng đi, thứ tự, ngân sách rủi ro và quyết định release | Không sa vào TASK/code/audit thường nhật |
| Tier 1 | Chuyển quyết sách thành contract đo được và resolve | Không viết source, không tự audit STANDARD/CRITICAL |
| Tier 2 | Implement trong boundary và tạo evidence thực | Không đổi contract, không tự phát hành verdict |
| Tier 3 | Tái hiện phép đo và phát hành verdict | Không sửa source, không thay Planner resolve |

Mỗi tầng chỉ sở hữu artifact của mình. Quyền ngoại lệ phải do Tier 0/Owner cấp rõ và được ghi lại.

## 2. Assurance lane

| Lane | Ví dụ | Execution | Resolution |
|---|---|---|---|
| FAST | docs, copy, styling, local refactor không đổi contract | targeted check; typecheck nếu sửa TS; diff hygiene | Tier 1 review trực tiếp |
| STANDARD | feature/fix cô lập | targeted tests + gate liên quan | Tier 3 focused audit |
| CRITICAL | schema, migration, RLS/auth, PII, money, infra/prod | release gates + LIVE/security checks áp dụng | Tier 3 deep audit |

Nếu diff phát sinh critical surface ngoài dự kiến, Tier 2 dừng phần đó và yêu cầu Tier 1 nâng lane.

## 3. Vòng đời

### FAST

```text
TASK READY_FOR_EXECUTION
  → HANDOFF READY_FOR_REVIEW
  → Tier 1 verify-handoff + tối đa 3 spot-check trọng yếu
  → ACCEPTED hoặc REVISION_REQUIRED
```

### STANDARD / CRITICAL

```text
TASK READY_FOR_EXECUTION
  → HANDOFF READY_FOR_AUDIT
  → STANDARD: FOCUSED | CRITICAL: DEEP | vòng sau: DELTA
  → Tier 1 resolve
  → ACCEPTED hoặc REVISION_REQUIRED
```

## 4. Contract tỷ lệ với rủi ro

- FAST: một outcome; boundary; 1–3 RQ; 1–4 STEP; 1–5 AC; gate và rollback ngắn.
- STANDARD: đủ interface/data/risk liên quan, không dẫn tài liệu không dùng.
- CRITICAL: thêm permission/state/migration/LIVE/rollback matrix tương ứng rủi ro.

Một evidence có thể chứng minh nhiều AC. Gate chỉ khai một lần. Không biến thao tác hành chính thành AC riêng.

## 5. Evidence Registry

Tier 2 và Tier 3 đăng ký phép đo bằng mã `E-xx`:

```text
E-01 | command | environment/baseline | exit/result | output tóm tắt
```

Các AC tham chiếu `E-01` thay vì copy output. Chỉ tạo `evidence/` khi output lớn, cần lưu ảnh/LIVE transcript hoặc cần hash đối chứng.

Mọi tuyên bố PASS phải là phép đo thật. `ENV_BLOCKED`, test skip hoặc fixture giả không được diễn giải thành PASS.

## 6. Audit depth và carry-forward

- `FOCUSED`: mặc định cho STANDARD ngay từ audit đầu. Tier 3 tự chạy ít nhất một behavior check trọng yếu, C-07/C-09/C-10 và check rủi ro áp dụng; không lặp full suite/build khi evidence Tier 2 hợp lệ và impact proof cho thấy không cần.
- `DEEP`: bắt buộc cho CRITICAL; độ sâu theo critical surface thực sự bị tác động, không phải checklist vô điều kiện.
- `DELTA`: dùng ở vòng sau khi spec, boundary, baseline và premise môi trường không đổi; chỉ đo finding còn mở, AC/check và caller bị tác động.
- `FULL` chỉ là alias tương thích artifact cũ của audit sâu; task mới không dùng.

Phần bất biến ghi `CARRIED_FORWARD` cùng round nguồn, baseline/commit, evidence nguồn và impact proof. Không tái chạy chỉ để đủ checklist.

## 7. Assurance checks

`C-07` Git hygiene, `C-09` contract validity và `C-10` diff scope luôn bắt buộc trong STANDARD/CRITICAL. STANDARD thêm behavior/security/data check áp dụng. CRITICAL khai C-01..C-10; mục không áp dụng dùng `SKIP(reason)`. P0/P1 luôn chặn; P2 chỉ chặn khi audit ghi `Release-blocking: YES`; P2 không chặn và P3 đi vào debt/backlog có owner thay vì mở vòng code/audit mới.

## 8. Blocker và quyền quyết định

Tier 2/3 chỉ ghi `BLOCKED` khi thiếu contract, authority, dependency hoặc môi trường bắt buộc. Báo cáo phải chỉ rõ evidence blocker, phần đã xong, đúng đầu vào cần và điều kiện chạy tiếp.

Tier 0 quyết định ngoại lệ production, go-live, bỏ/giảm gate, chấp nhận rủi ro hoặc mở nhiều execution stream. Tier 1 ghi quyết định đó vào TASK/Resolution.

## 9. Bộ kiểm tra

```powershell
pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md
pwsh .ai-pipeline/scripts/verify-gates.selftest.ps1
pwsh .ai-pipeline/scripts/verify-pipeline.ps1
```

Health check xác nhận cấu trúc pipeline, không thay thế test của sản phẩm.
