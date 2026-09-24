> **HISTORICAL / NON-AUTHORITATIVE**
> This document is retained for historical purposes. Active planning authority belongs to PLANNER_HANDOVER and the current TASK.

# HỢP ĐỒNG TÁC CHIẾN — HAI STREAM TIER 1 SONG SONG (trình T0 duyệt và điều phối)

> **HISTORICAL / SUPERSEDED:** Tài liệu này chỉ giữ làm evidence cho đợt điều phối 2026-09-15. Task mới dùng `.ai-pipeline` protocol `V2_FAST_FREEZE` và `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §47.1. Không dùng lại mô hình Planner-only/Executor cũ hoặc các baseline/status trong tài liệu này.

> **Status:** T0 APPROVED WITH AMENDMENTS — được phép mở hai stream theo §11.
> **T0 verdict:** 2026-09-15. Baseline thực thi: `origin/main` = `68e184e`.
> Tài liệu này **không** phải architecture authority,
> **không** thay `TASK.md`, **không** phát hành verdict, **không** commit/push.
> **Thứ bậc:** thấp hơn `docs/TIER0_HANDOVER.md` §3. Nếu xung đột, TIER0_HANDOVER thắng.
> **Ngày đo baseline:** 2026-09-15. **Tác giả:** Tier 1 phiên hiện tại (giữ worktree `C:\CodeApp\HrP`).
> **Người nhận:** T0 (Owner điều phối) → duyệt, chia vai, ra quyết định GO/NO-GO ở §7.

---

## 1. Mục tiêu

1. Đóng N-lane đang dở (N1 ACCEPTED, N3 closeout + quyết migration) mà **không chặn** Admin UI.
2. Mở Admin UI quan hệ (W1) song song, đúng giới hạn D-1 đã chốt.
3. Hai Tier 1 làm song song **không giẫm file nhau**, một owner duy nhất cho schema/migration
   và cho `src/domains/talent/**` tại mỗi thời điểm.
4. Worktree local đang lệch remote được heal **trước**, không mở TASK mới trên nền sai.

---

## 2. Vị trí xuất phát (đã đo, không suy diễn)

| Phép đo | Kết quả |
|---|---|
| Worktree local HEAD | `40cd9d4` (branch `main`) |
| `origin/main` | `68e184e` |
| Lệch | ahead 0, behind **12** (`git rev-list --left-right --count HEAD...origin/main` = `0 12`) |
| 12 commit mới | N3 Slice A+B+C trọn vẹn: `4e7b8fe` (ServiceModel + Placement + lifecycle), `29e5d38`, `86385bc` (integration 9-case trên nhánh test N3), `2aff2b3`, `8de4e60`, `dc7b8fc`, `fc622fa`, `c5146c7`, `8444cdc`, `b98e470`, `1a1eba4`, `68e184e` (tracker v2.15). Tổng 19 file, +4353/−9 |
| N3 trên remote | `TASK.md` = `v0.3 DRAFT` / `Status DRAFT` (trễ so với code); `HANDOFF.md` = `DB_GATE_PASSED_AWAITING_TIER3_FINAL_AUDIT_ROUND_4` (nhãn cũ, thực tế đã qua round 5); AUDIT Tier 3 LIGHT **PASS 2 vòng liên tiếp** (round 4 + round 5), Slice C **16/16 PASS** trên nhánh test N3 mới. Migration `prisma/migrations/20260914212136_n3_service_model_placement/migration.sql` **đã có file trên main, chưa apply lên `hrp-live`** |
| N1 intake-writer trên remote | `TASK.md` = `v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5`; AUDIT: "APPROVE for merge" + "Tier 1 declares N1 ACCEPTED only after this PASS verdict is recorded" → **chưa ACCEPTED** |
| Cursor PLANNER tại remote | `updated_at: 2026-09-14 23:45`; gate `N3_AUDIT_2X_PASS_READY_FOR_OWNER_MERGE; N1_PROD_VERIFICATION_REMAINS_OPEN` (Tier 0/Owner xác minh Vercel rebuild + smoke admin intake bằng credential thật) |
| W0/W1/W2 trên remote | **Không commit nào** đụng `app/admin`, API read, `package.json`, `.gitignore` → còn nguyên chưa làm |
| Worktree local dirty | `M` 2 file `src/domains/talent/placement-case.service(.test).ts`; `??` plan V6 rev 3 + 5 file rác root (`orca.bat`, `orca-status.bat`, `temp.txt`, `temp3.txt`, `tsc-main.txt` — `tsc-main.txt` là mới so với plan) |
| Marker kẹt | `src/domains/talent/placement-case.service.ts:15` còn dòng `>>>>>>> Stashed changes` (đo bằng grep) → **phải xóa thủ công sau khi đối chiếu, không auto-resolve** |
| Mapping D-2b | grep marker D-2b trong `docs/PLANNER_HANDOVER.md` cả local lẫn remote = 0 hit → **phải ghi lại sau khi pull**, dựa trên evidence đã có (`docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-run/probe-20260913.clean.ndjson:3`), không ghi secret mới vào repo |

---

## 3. Phase 0 — HEAL (một owner, chặn mọi stream, xong trước)

**Chủ đề xuất:** Tier 1-A (phiên hiện tại, đang giữ worktree bẩn). T0 có thể đổi người, nhưng chỉ một người làm.

| Bước | Việc | Xong khi |
|---|---|---|
| H-1 | Đọc diff 2 file `M`, đối chiếu với N1 round-5 đã land; **bỏ WIP test SAVEPOINT đã lỗi thời**, giữ service đúng remote | `git status` hết `M` trong `src/domains/talent/**` |
| H-2 | Xóa marker `>>>>>>> Stashed changes` dòng 15 sau khi đối chiếu ngữ cảnh comment | grep marker = 0 hit |
| H-3 | `git fetch origin` + hòa lên `68e184e` (fast-forward nếu sạch, rebase có kiểm soát nếu còn WIP cần giữ) | `rev-list --count HEAD...origin/main` = `0 0` |
| H-4 | Ghi lại mapping D-2b + quyết định rotate-sau vào `docs/PLANNER_HANDOVER.md` §9 + rev log (dựa trên evidence cũ, không thêm identifier/secret mới) | grep lại thấy nội dung mapping, scan secret = 0 |
| H-5 | Xác nhận 5 file rác root giữ nguyên untracked, chưa ai `git add` nhầm | `git status --porcelain` chỉ còn plan + (tùy T0) file rác đã biết |

Không stream nào được mở TASK mới trước khi H-3 xong.

---

## 4. Chia stream (đề xuất — T0 chốt vai cuối)

**Tier 1-A = phiên hiện tại** (tác giả plan Admin UI, đang giữ worktree `C:\CodeApp\HrP`).
**Tier 1-B = Tier 1 còn lại** (ưu tiên stream đã làm N3 để giữ continuity N-lane).

### Stream S1 — N-closeout + Docs/Config (đề xuất: Tier 1-B)

| Việc | Rễ file sở hữu (độc quyền) | Audit |
|---|---|---|
| N3 closeout: xác nhận merge-state (§7-Q1), quyết apply migration (§7-Q2); đưa `TASK.md` `DRAFT`→`ACCEPTED`, sửa nhãn HANDOFF cũ, sync cursor | `prisma/**`, `src/domains/talent/placement*.ts`, `tests/db/placement-lifecycle-integration.test.ts`, `vitest.integration-files.ts`, `docs/tasks/hrp-v6-n3-service-model-placement/**` | LIGHT (đã có 2 PASS; chỉ audit delta nếu đổi code) |
| N1 ACCEPTED: Planner Resolution sau khi có kết quả verify prod (§7-Q3) | `docs/tasks/hrp-v6-n1-intake-writer/**` (docs-only, không đụng code đã land) | NONE (docs) |
| W0 docs/config: W0.3 rà Status (trừ dir N1/N3 nếu S1 đang sửa — thực tế S1 sửa luôn 2 dir này nên W0.3 thuộc S1), W0.4 YAML trùng key, W0.5 `-bak`, W0.6 roadmap, W0.7 gitignore (+ thêm `tsc-*.txt`), W0.8 lane `npm test`, dời file evidence root về đúng thư mục task | `docs/**` (trừ `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` của plan), `.gitignore`, `package.json`, `docs/PLANNER_HANDOVER.md` §0+§9+rev log, `evidence/` root | NONE |
| Đề xuất hygiene branch test N3 (`hrp_n3_v3`, `hrp_n3_v5` vs quy tắc canonical) | văn bản trong TASK closeout, không tự xóa branch | NONE |

### Stream P2 — Admin UI quan hệ (đề xuất: Tier 1-A)

| Việc | Rễ file sở hữu (độc quyền) | Audit |
|---|---|---|
| W1 `AD1`–`AD5` (5 defect đã chốt D-3/D-4; `AD3` land trước/cùng `AD1`) | `app/admin/**`, `src/shared/ui/role-guard/**`, `app/api/workers/route.ts`, `app/api/admin/commission-ledger/**` | NONE, riêng AD2/AD3 LIGHT (đụng read scope — xem §9.2.1 của plan) |
| Chuẩn bị W2 (nền detail: breadcrumb + RelatedObjects + row deep-link) — **chỉ mở TASK W2 sau khi W1 xong** | cùng rễ trên | NONE |

### Cấm tuyệt đối (cả hai stream)

- P2 **cấm** `prisma/**`, migration, `src/domains/talent/**`, `src/domains/staffing/**`, `app/(jobs)/**`.
- S1 **cấm** `app/admin/**`, `src/shared/ui/role-guard/**`.
- Chỉ S1 được sửa `docs/PLANNER_HANDOVER.md`. P2 **cấm** chạm file này (tránh conflict YAML cursor).
- Không reuse slug task đã ACCEPTED. Slug mới đề xuất (chưa phát hành, T0 duyệt mới tạo):
  `hrp-v6-n3-closeout-acceptance`, `hrp-v6-docs-config-reconciliation`,
  `hrp-v6-admin-truth-defects`, `hrp-v6-admin-detail-foundation`.
- Không tự commit/push lên `main`. Mỗi stream làm trên branch/worktree riêng
  (vd. `tier1/n3-closeout`, `tier1/admin-truth-defects`), T0 quyết merge.
- Không chạy migration/seed/destructive trên production. Không `git add -A` / `git add .`.
- Mọi giá trị nhạy cảm trong TASK/HANDOFF/evidence chỉ ghi `[REDACTED]`.

---

## 5. Giao thức song song

1. Mỗi stream một worktree riêng, checkout từ `68e184e` **sau Phase 0**.
2. Rebase lên `origin/main` trước khi xin merge; conflict báo T0, không tự resolve phần của stream kia.
3. Cập nhật tiến độ bằng TASK/HANDOFF của stream mình; cursor PLANNER chỉ S1 viết (P2 đọc).
4. Gate cuối mỗi TASK: Tier 3 theo audit mode ở §4; Tier 1 không tự phát hành verdict.
5. `W2 sau W1` (cùng vùng `app/admin`). W3/W4 sau W2. TASK migration N2 **sau khi N3 đóng**.
   Nghiên cứu N2 (đọc backlog, lập kế hoạch read-only) được chạy song song ngay trong P2 khi chờ review.

---

## 6. Thứ tự thực hiện

```
Phase 0 HEAL (S1-owner, chặn) → T0 duyệt hợp đồng + ra §7-Q1..Q6
  ├─ S1: N3 closeout + N1 ACCEPTED + W0 docs/config
  └─ P2 (song song, sau H-3): W1 AD1–AD5 → W2 → (W3/W4 theo plan, TASK sau)
```

---

## 7. Quyết định cần T0 (duyệt hợp đồng = trả lời 6 mục)

| ID | Câu hỏi | Đề xuất Tier 1 | Chặn |
|---|---|---|---|
| Q1 | Trạng thái merge N3: code N3 đã nằm trên `origin/main` nhưng cursor ghi "chờ merge → main". Xác nhận: còn bước merge nào chưa xong, hay chỉ còn apply migration? | Coi code đã trên main; closeout = xác nhận + sửa nhãn HANDOFF/TASK | S1 |
| Q2 | Migration `20260914212136_n3_service_model_placement` có apply lên `hrp-live` không, khi nào, ai làm, preflight nào (branch gate, pending check, lock, rollback)? | GO riêng một cửa, Owner/OP thực hiện, Tier 1 không tự apply prod | S1 |
| Q3 | Ai verify Vercel rebuild từ N1 round-5 + smoke admin intake bằng credential thật, và ghi kết quả ở đâu để N1 ACCEPTED? | Tier 0/Owner làm, Tier 1-B ghi Planner Resolution | N1 ACCEPTED |
| Q4 | Duyệt chia vai §4 (Tier 1-A = P2 UI, Tier 1-B = S1 N+docs) và 4 slug TASK mới | Duyệt nguyên văn hoặc đổi vai giữ nguyên rễ file | Cả hai |
| Q5 | Branch test N3 mới vs quy tắc canonical: giữ/dọn `hrp_n3_v3`, `hrp_n3_v5` thế nào; khẳng định lại branch test chuẩn | Giữ quyết định trong closeout, không tự xóa branch | S1 |
| Q6 | Duyệt dời file evidence root về thư mục task + W0.7/W0.8 (gitignore, lane test) | Duyệt — blast radius 0, đã đo không consumer | S1 |

Credential rotate giữ nguyên quyết định cũ (hoãn tới sau deploy production) — không đưa vào gate.

---

## 8. Nghiệm thu

1. Phase 0 xong: worktree sạch, marker = 0, ngang `origin/main`, mapping D-2b có lại.
2. N3: TASK ACCEPTED + HANDOFF nhãn đúng + cursor sync; migration có quyết GO/NO-GO rõ ràng.
3. N1: ACCEPTED sau kết quả verify prod được ghi.
4. W0: hết Status sai, hết YAML trùng key parse-fail, hết file evidence root, lane test an toàn.
5. W1: 5 defect đóng, `AD3` trước/cùng `AD1`, không ID thô, không filter trên field không tồn tại.
6. Hai stream không có commit giẫm rễ file của nhau (kiểm bằng `git diff --name-only` chéo).

---

## 9. Phụ lục — căn cứ đo (không secret)

- Lệnh đo lệch: `git rev-list --left-right --count HEAD...origin/main` → `0 12`.
- Lệnh liệt kê: `git log --oneline HEAD..origin/main` (12 dòng, từ `4e7b8fe` tới `68e184e`).
- Trạng thái TASK: `git show origin/main:<path>/TASK.md | grep '^\| Status'` (N1 `READY_FOR_AUDIT_ROUND_5`; N3 `DRAFT`).
- Cursor: `git show origin/main:docs/PLANNER_HANDOVER.md | grep -E 'updated_at:|current_task:|current_gate:'`.
- Marker: `grep -n '>>>>>>>' src/domains/talent/placement-case.service.ts` → dòng 15.
- Debris: `git status --porcelain` (2 `M` + 6 `??` gồm plan rev 3).
- Plan nền: `docs/V6/V6_OUTSTANDING_WORK_PLAN.md` rev 3 (Approved một phần, D-1..D-6 đã chốt).
- Quy tắc song song viện dẫn: D-1 (UI/docs song song N-lane), một owner schema/migration, PLANNER single-writer.

---

## 10. Phê duyệt

- [ ] T0 duyệt hợp đồng + chia vai §4 (ghi tên Tier 1-B vào đây): ____________________
- [ ] Q1: ____________________
- [ ] Q2 (GO/NO-GO + người thực hiện + thời gian): ____________________
- [ ] Q3 (người verify + nơi ghi kết quả): ____________________
- [ ] Q4/Q5/Q6: ____________________
- [ ] Lệnh bắt đầu Phase 0 + mở 2 stream: ____________________

---

## 11. T0 verdict và lệnh thực thi — 2026-09-15

### 11.1 Đính chính trạng thái sau khi proposal được viết

- N3 đã fast-forward lên `origin/main` tại `68e184e`.
- Migration `20260914212136_n3_service_model_placement` đã apply thành công trên
  `hrp-live`; `prisma migrate status` sau deploy báo schema up to date; catalog
  post-check xác nhận cột mới, FK và FORCE RLS.
- Vercel đã deploy thành công commit `68e184e`, nên production build đã chứa cả N1
  `55f4180` và N3. N1 chỉ còn smoke có xác thực bằng tài khoản ADMIN thật.
- CI ở `68e184e` đang đỏ vì 9 lỗi TypeScript trong
  `tests/db/intake-writer-integration.test.ts` và integration lane thiếu secret DB test.

### 11.2 Quyết định Q1..Q6

| ID | Quyết định T0 |
|---|---|
| Q1 | N3 đã merge. Không còn thao tác merge N3 nào. S1 chỉ closeout trạng thái tài liệu. |
| Q2 | Đã GO và đã apply/verify trên `hrp-live`. Cấm apply lại; chỉ ghi evidence/trạng thái. |
| Q3 | Vercel rebuild đã xác nhận. Smoke ADMIN thật thuộc T0/Owner; S1 chuẩn bị checklist và ghi kết quả khi có evidence, không dùng 401 để kết luận PASS. |
| Q4 | Duyệt hai vai: S1 = N-closeout + CI + docs/config; P2 = Admin UI W1. Không cần task riêng cho sửa nhãn N3 đơn giản. Dùng slug `hrp-v6-docs-config-reconciliation` và `hrp-v6-admin-truth-defects`. |
| Q5 | `hrp_mp2_test` là branch test canonical. Giữ các branch N3 tạm thời cho đến khi S1 xác nhận evidence đã đủ; Tier 1 không tự xóa branch. T0/Owner dọn sau. |
| Q6 | Duyệt dời evidence root, `.gitignore` và đổi lane `npm test` theo W0.7/W0.8. |

### 11.3 Thay Phase 0 HEAL bằng isolation

Không reset, checkout, stash, rebase hoặc sửa WIP trong `C:\CodeApp\HrP`. Checkout này
được giữ nguyên để Owner xử lý sau. Hai Tier 1 phải tạo hai worktree sạch riêng từ
`origin/main` tại `68e184e`. Vì vậy H-1..H-5 không còn là gate mở stream.

### 11.4 Lệnh mở hai stream

**S1 — N-closeout, CI, docs/config**

1. Tạo worktree/branch sạch từ `origin/main`; xác minh baseline `68e184e`.
2. Sửa 9 lỗi TypeScript trong integration test N1, không đổi behavior production.
3. Chạy typecheck và unit gates. Integration CI thiếu DB secret phải ghi `ENV_BLOCKED`;
   không trỏ CI vào `hrp-live`, không đưa credential vào repo/log.
4. Closeout N3 theo trạng thái thật; closeout phần Vercel của N1 và giữ ADMIN-authenticated
   smoke ở trạng thái OPEN cho tới khi T0 cung cấp evidence.
5. Thực hiện W0.3..W0.8, gồm dời evidence root; chỉ S1 sửa
   `docs/PLANNER_HANDOVER.md`.
6. Audit NONE cho docs/config; chỉ LIGHT nếu thay đổi logic ngoài test typing.

**P2 — Admin truth defects W1**

1. Tạo worktree/branch sạch độc lập từ `origin/main`; xác minh baseline `68e184e`.
2. Triển khai AD1..AD5. AD3 phải hoàn thành trước hoặc cùng AD1.
3. Không migration, không schema, không `src/domains/talent/**`, không
   `src/domains/staffing/**`, không `docs/PLANNER_HANDOVER.md`.
4. Test đúng changed surface; Tier 3 LIGHT chỉ cho AD2/AD3, phần UI còn lại audit NONE.
5. Xong W1 mới đề xuất W2; không tự mở W2 trong cùng diff.

### 11.5 Merge order

S1 và P2 có thể push branch độc lập. T0 ưu tiên merge S1 trước để làm xanh Quality CI và
chuẩn hóa cursor; P2 rebase lên main mới rồi merge sau. Nếu S1 còn `ENV_BLOCKED` ở lane
integration, điều đó không ngăn P2 merge khi changed-surface gates của P2 PASS.
