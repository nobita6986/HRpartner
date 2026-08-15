# AUDIT — hrp-phase0-foundation · Round 1
> Tier 3 · 2026-08-16 · Verdict tổng: **CONDITIONAL**

**Independence Statement:** Tôi là Tier 3 Auditor độc lập. Tôi không tham gia vào quá trình viết mã của Tier 2. Các kết luận dưới đây dựa trên mã nguồn thực tế và kết quả thực thi lệnh cục bộ.

## Bảng AC
| AC | Kết quả | Evidence (lệnh + output thật) |
|---|---|---|
| AC-01 | **PASS** | `grep -rn "new PrismaClient" app/ src/ packages/` chỉ trả về `src/lib/db.ts:10`. Mọi tham chiếu khác đã dùng singleton. |
| AC-02 | **PARTIAL** | `npx tsc --noEmit` exit 0 thành công. Tuy nhiên, `package.json` và `vercel.json` **KHÔNG** có cấu hình hỗ trợ workspaces (Tier 2 tự ý bỏ qua). |
| AC-03 | **PARTIAL** | `npx prisma validate` pass. File `migration.sql` của `g0_baseline` là add-only (chỉ `CREATE TABLE` và `CREATE INDEX`). Không thể verify `prisma migrate dev` do thiếu môi trường Neon dev branch. |
| AC-04 | **PASS** | `npx vitest run` thành công: 2 test files, 32 tests passed (exit 0). Không có lỗi import alias. |
| AC-05 | **PARTIAL** | File `app/job-board/page.tsx` tồn tại, có `revalidate = 300`, watermark "DỮ LIỆU MINH HỌA" và dữ liệu khớp yêu cầu S05. Chưa verify được runtime do chưa deploy Vercel thực tế. |
| AC-06 | **PASS** | Đọc `prisma/seed.mjs` xác nhận sử dụng dữ liệu Canonical (An Phát, Yên Phong, Sao Việt), mask số điện thoại, CCCD. Logic sử dụng `upsert` (idempotent). |
| AC-07 | **PASS** | `ls prisma/_archive/` có chứa 3 tệp (kèm `README.md`). Thư mục `prisma/` gốc chỉ còn `schema.prisma`. |
| AC-08 | **PASS** | `git ls-files prisma/migrations/` trả về các file sql/toml cũ và thư mục `20260816010542_g0_baseline` đã được tracked trên git. |
| AC-09 | **PARTIAL** | `docs/CONTRACT_BCC.md` tồn tại, cấu trúc schema khớp với model `PortalTimesheet`. Đang chờ Founder ký xác nhận (Freeze). |
| AC-10 | **PASS** | Check `git log -p`: Không có lệnh migrate trực tiếp lên prod, không có `.env`, `*.xlsx`, `db_*.txt`. App/bcc chỉ đổi đúng phần gọi `getPrisma()`. Không leak secret. |

## Findings
| ID | Severity | Mô tả | Vị trí (file:line) | Đề xuất sửa |
|---|---|---|---|---|
| AUD-001 | P2 | Thiếu cấu hình Workspaces (DEV-01) | `package.json:1`, `vercel.json:1` | Cần cập nhật `package.json` (thêm `"workspaces"`) và `vercel.json` để không bị fail khi build thật sự. Planner cần quyết định lùi sang Phase 1 hay sửa liền. |
| AUD-002 | P2 | Thiếu Neon Dev Branch (BLK-01) | `N/A:0` | Yêu cầu Founder / Planner cung cấp môi trường Neon dev DB (`DATABASE_URL_DEV`) để Tier 2 có thể verify việc migrate add-only là hoàn toàn an toàn và thành công thật sự. |
| AUD-003 | P3 | Hardcode dữ liệu & Inline Style (DEV-02, DEV-03) | `app/job-board/page.tsx:15` | Chấp nhận tạm cho mục đích demo (Phase 0). Tier 1 cần ghi nhận việc sẽ refactor lại dùng query thật từ DB và sử dụng `_assets/hrp.css` vào Phase 4. |
| AUD-004 | P3 | Chờ ký duyệt Contract BCC (BLK-03) | `docs/CONTRACT_BCC.md:175` | Founder cần review kỹ contract và ký xác nhận Freeze. Tier 1 theo dõi. |
| AUD-005 | P3 | Chưa verify được URL runtime (BLK-02) | `N/A:0` | Cần Deploy Vercel (theo STEP-08 của nhiệm vụ) để audit toàn bộ AC-05 trên môi trường staging/production. |

## Verdict tổng + lý do
**Verdict:** `CONDITIONAL`
**Lý do:**
1. Tất cả các yếu tố core (Database Integrity, Scope Adherence, Secret/PII Leak) đều vượt qua. **Không có finding P0 hay P1**. Code an toàn.
2. Có một số finding P2/P3 liên quan tới Deviations (tự bỏ workspaces để tránh build lỗi) và Blockers (thiếu môi trường test Neon dev branch, chưa deploy Vercel, chưa có chữ ký Founder). 
3. Các vấn đề này cần Tier 1 (Planner) xác nhận chấp thuận hoặc lên kế hoạch xử lý (Phase 1) trước khi có thể chuyển trạng thái sang PASS hoàn toàn.
