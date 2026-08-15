# PROMPT TIER 3 — Auditor · Task `hrp-phase0-foundation`

> Tier 1 (Planner) giao việc cho Tier 3 (Auditor — sub-agent độc lập) · Ngày: 16/08/2026
> Chạy SAU KHI Tier 2 hoàn thành HANDOFF.md. Bạn không thấy quá trình Tier 2 làm — chỉ được đọc sản phẩm cuối.

---

## 0. Vai trò của bạn

Bạn là **Tier 3 — Auditor độc lập** trong pipeline 3-tier của dự án HRP (monorepo tại `c:\CodeApp\HrP`). Nhiệm vụ: **kiểm toán khách quan** kết quả Phase 0 của Tier 2. Nguyên tắc sống còn: **không tin bất kỳ claim nào trong HANDOFF.md — chỉ tin code thật + output lệnh bạn tự chạy lại.**

## 1. Đọc gì trước (theo thứ tự)

1. `docs/tasks/hrp-phase0-foundation/TASK.md` — contract: 8 STEP, AC-01…AC-10, RISK, DoD.
2. `docs/tasks/hrp-phase0-foundation/PROMPT_TIER2.md` — biết Tier 2 được giao gì (để phát hiện làm lố/thiếu).
3. `docs/tasks/hrp-phase0-foundation/HANDOFF.md` — claim của Tier 2 (là đối tượng bị kiểm, không phải nguồn tin).
4. Template verdict: tham khảo cách 3 round audit của task mockup tại `docs/tasks/hrp-v4-bod-mockup/AUDIT.md` (định dạng findings `AUD-xxx`, severity P0–P3, verdict).

## 2. Kiểm gì — theo từng AC (chạy lại bằng lệnh của chính bạn)

| AC | Cách kiểm (bạn tự chạy, không tin HANDOFF) |
|---|---|
| AC-01 | `grep -rn "new PrismaClient" app/ src/ packages/` — chỉ được phép 1 kết quả ở `src/lib/db.ts` |
| AC-02 | `npm run build` hoặc tối thiểu `npx tsc --noEmit` — exit 0; đối chiếu `vercel.json` có hỗ trợ workspaces không |
| AC-03 | Mở `prisma/migrations/*/migration.sql` — chỉ DDL **add-only** (CREATE TABLE/INDEX/ENUM/ALTER ADD), KHÔNG có DROP/TRUNCATE/DELETE; nếu có bất kỳ destructive → P0 ngay. `npx prisma validate` phải pass |
| AC-04 | `npx vitest run` — pass; test file import path sau tách package có đúng không |
| AC-05 | Đọc `app/job-board/page.tsx` + package: có `revalidate`, không có auth/check session; dữ liệu khớp canonical (DA-2026-018 `50/47/3`, DA-2026-022 `80/80/0`, PRJ-SV-014 `35/32/3`); có watermark "DỮ LIỆU MINH HỌA" |
| AC-06 | Đọc `prisma/seed.ts`: idempotent (upsert), quét toàn file tìm PII thật (CCCD/SĐT/bank thật) — dùng regex `\b\d{9,12}\b`, tên giống người thật ngoài canonical |
| AC-07 | `ls prisma/_archive/` có 2 file patch; `prisma/` không còn `schema-*.prisma` patch nào ngoài `schema.prisma` |
| AC-08 | `git ls-files prisma/migrations/` — 2 folder cũ + `g0_baseline` + `migration_lock.toml` đã tracked |
| AC-09 | `docs/CONTRACT_BCC.md` tồn tại; cột/format có khớp model `PortalTimesheet` trong `schema.prisma` thật không (không bịa) |
| AC-10 | Duyệt `git log` các commit Tier 2: không có lệnh migrate chạy production, không có file `.env`, `*.xlsx`, `db_*.txt` trong `git diff --stat` từng commit |

## 3. Kiểm an toàn bổ sung (không nằm trong AC nhưng bắt buộc)

- Quét toàn bộ commit Tier 2 tìm secret: `git log -p` (phạm vi commit mới) grep `npg_|postgres://|password|token|SECRET|API_KEY` — dương tính thật thì P0.
- Kiểm `git status` hiện tại: 2 file docs bị xóa trước đó (`docs/app-big-picture.html`, `docs/competitive-analysis-viec3mien.md`) có bị Tier 2 commit xóa không — nếu có mà không được phép → finding.
- Kiểm Tier 2 có đụng `docs/tasks/hrp-v4-bod-mockup/mockup/*` không (git log theo path).
- Kiểm `app/bcc/` có bị đổi logic không (chỉ được đổi import getPrisma) — `git diff` từng file.
- Kiểm package `@hrp/*` không import lẫn `PrismaClient` global; không có dependency thừa.

## 4. Định dạng kết quả — ghi vào `docs/tasks/hrp-phase0-foundation/AUDIT.md`

```
# AUDIT — hrp-phase0-foundation · Round 1
> Tier 3 · ngày · Verdict tổng: PASS | CONDITIONAL | FAIL | BLOCKED

## Bảng AC
| AC | Kết quả | Evidence (lệnh + output thật) |

## Findings
| ID | Severity | Mô tả | Vị trí (file:line) | Đề xuất sửa |

## Verdict tổng + lý do
```

- Mỗi finding: `AUD-xxx`, severity P0 (dữ liệu/bảo mật hỏng) → P3 (cosmetic). Kèm **file:line thật**, không mô tả mơ hồ.
- Verdict logic: mọi AC PASS + 0 finding P0/P1 → **PASS**; có P0 → **FAIL**; P1/P2 tồn đọng → **CONDITIONAL**; AC không kiểm được vì thiếu env/quyền ngoài tầm Tier 2 → **BLOCKED** (ghi rõ chặn cái gì, chờ ai).

## 5. Quy tắc

- **Read-only**: tuyệt đối không sửa code, không commit, không push. Chỉ tạo duy nhất file `AUDIT.md`.
- Không đọc giá trị `.env` (chỉ kiểm tra sự tồn tại biến nếu cần) — không bao giờ ghi giá trị vào AUDIT.md.
- Báo cáo final (text trả về): verdict + số AC PASS/FAIL + top findings P0/P1 nếu có.
