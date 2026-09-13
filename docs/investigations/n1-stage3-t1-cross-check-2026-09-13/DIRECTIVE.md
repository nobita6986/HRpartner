# T1 Directive — N1 STAGE 3 Cross-Check Investigation (2026-09-13 14:14 UTC+7)

**Owner:** T1 (Tier 1)
**Target:** T3 (Tier 3) — execute checklist, return evidence
**Trigger:** Tier0 terminal log (anh dán) báo "STAGE 3 PASS, gate 28/28, post-check C PASS, re-clone xong". Nhưng `current_gate` trong `docs/PLANNER_HANDOVER.md` rev 2.29 = `N1_STAGE3_AV4_FIX_PUSHED_AWAITING_TIER0_REAPPLY`. Hai trạng thái có vẻ mâu thuẫn → cần đối chiếu.

**Authority scope:** READ-ONLY. T3 KHÔNG chạy migration. KHÔNG resolve. KHÔNG commit code. KHÔNG chạm `hrp-live`.

---

## Mục tiêu

Xác định:
1. Trạng thái thật của Stage 3 N1 tại thời điểm 2026-09-13 14:14 UTC+7 là gì?
2. Tier0 log có đủ điều kiện để T1 mở authorization Stage 3 chưa, hay vẫn phải giữ `AWAITING_TIER0_REAPPLY`?

---

## Checklist T3 phải trả lời (YES/NO + bằng chứng)

### Luồng A — Re-clone `hrp_mp2_test` (Rev 2.27 → 2.28 yêu cầu)

- [ ] **A1.** Có evidence Tier0 đã `reset + re-clone branch hrp_mp2_test từ hrp-live` không? Tìm:
  - log `neon branches reset` / `neon branches create --parent hrp-live` (timestamp)
  - file ndjson/log mới trong `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-run/` (nếu có)
- [ ] **A2.** Bằng chứng re-clone ghi ở đâu? Tier0 worktree / Tier0 sandbox / local / remote?
- [ ] **A3.** Re-clone đó có **SAU** commit `4e49a3a` (13:55) hay **TRƯỚC** commit đó?

### Luồng B — Pre-check B trên `hrp-live` (rev 2.28 FAIL, yêu cầu chạy lại sau AV4)

- [ ] **B1.** Có evidence Tier0 đã chạy lại `verify-pre-reclone.sql` trên `hrp-live` (theo fingerprint v1.1) **SAU** khi AV4 apply xong chưa?
- [ ] **B2.** Kết quả B.2 + B.3 (employment_episodes tồn tại) + B.6 (media + MediaStatus tồn tại) + B.7 (RPC ≥ 1 row) — PASS hay FAIL?
- [ ] **B3.** Fingerprint đã là v1.1 chưa? Tier0 dùng file nào?

### Luồng C — AV4 Reapply lên `hrp-live` (điều kiện tiên quyết theo rev 2.29)

Đây là luồng **quan trọng nhất** — Tier0 terminal log không nói rõ đã làm:

- [ ] **C1.** Có evidence **migration 20260912001_av4_media_library đã được apply lên `hrp-live`** không?
  - Tìm: bảng `media` + enum `MediaStatus` đã tồn tại chưa? (query `pg_class` / `pg_type`)
  - `_prisma_migrations` có row mới cho migration này không? (băm sha256, started_at, finished_at, applied_steps)
- [ ] **C2.** Migration apply bằng "transaction có kiểm soát" hay `prisma migrate deploy`? Có `BEGIN ... COMMIT` log không?
- [ ] **C3.** **Tracking row** đã được ghi chưa? Bảng tracking nào? Schema cột gì? Hash evidence ra sao?
- [ ] **C4.** Có commit evidence nào Tier0 đẩy lên origin/main hoặc origin/tier1 về C1-C3 không?
  - Check: `git log origin/main --since="2026-09-13 12:00" --until="2026-09-13 14:30" --grep="AV4\|tracking\|hrp-live"`
  - Check: `git log origin/tier1/n1-foundation --since="2026-09-13 12:00" --until="2026-09-13 14:30"`

### Luồng D — STEP 1.5 (Neon control-plane gate)

- [ ] **D1.** `neon_branch_gate.ps1` đã được Tier0 chạy với NEON_API_KEY + NEON_PROJECT_ID thật chưa? Exit code bao nhiêu?
- [ ] **D2.** Tier0 có ghi rõ `endpoint-id ` + `branch-name = hrp_mp2_test` resolved cùng branch của NEON_PROJECT_ID không?

### Luồng E — Stage 3 Probe Real Run

- [ ] **E1.** Probe.mjs có chạy với `N1_STAGE3_REAL=true` không? (nếu không → chỉ là self-test, KHÔNG tính là Stage 3 PASS thật)
- [ ] **E2.** `summary.stage3_real_pass` = true hay false?
- [ ] **E3.** Exit code = 0?
- [ ] **E4.** `cleanup-needed pass=true, n_ids=0`?

### Luồng F — Evidence commit

- [ ] **F1.** Tier0 có commit evidence mới (NDJSON + stderr trace + post-check C output) lên repo chính không? Commit hash?
- [ ] **F2.** Evidence có trong `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-run/` không?

---

## Quy tắc

1. Mỗi mục trả lời = `YES/NO/PARTIAL` + đường dẫn evidence + 1 dòng trích nguyên văn (nếu có).
2. Nếu không tìm thấy evidence → ghi `NOT FOUND` + search pattern đã thử.
3. T3 KHÔNG suy luận. T3 KHÔNG dùng log terminal Tier0 làm evidence (vì terminal log có thể đã cũ/bị crop). T3 chỉ dùng **git history + file trong working tree + Tier0 sandbox (nếu truy cập được)**.
4. Trả kết quả dưới dạng bảng. T1 sẽ review và ra quyết định.

---

## Output

T3 viết báo cáo vào `docs/investigations/n1-stage3-t1-cross-check-2026-09-13/REPORT.md` và trả summary 1-paragraph về T1.
