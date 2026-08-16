# PROMPT_TIER2_R6 — hrp-phase0-foundation · Round 6

> Từ: Tier 1 (Planner) · 16/08/2026 · Căn cứ: `PLANNER-DECISION-hrp-phase0-foundation.md` v1.6 (§12 Resolution Round 7, DEC-32) + `TASK.md` v1.6
> Người nhận: Tier 2 — Executor (agent riêng, sub-agent)

Bạn là **Tier 2 — Implementation Engineer**. Đọc trước khi làm:

1. `docs/tasks/hrp-phase0-foundation/TASK.md` — contract v1.6 (STEP-10 + AC-12 mới; các STEP/AC khác đã xong, không đụng).
2. `.ai-pipeline/rules/00-global-rules.md` + `.ai-pipeline/rules/02-engineer-rules.md`.
3. `docs/tasks/hrp-phase0-foundation/HANDOFF.md` (round trước — để biết hiện trạng).

## Phạm vi round này — ĐÚNG 1 việc: STEP-10 / AC-12

**Sidebar filter trái cho `/job-board`** theo mockup S05 **v2** (`docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html` — ĐỌC KỸ, đây là nguồn chân lý thiết kế):

1. Bỏ filter chips ngang hiện tại trong `app/job-board/page.tsx`.
2. Thêm panel filter trái 240px (surface `#FFFFFF`, border `#EAE8E4`, radius 16px, padding 20px):
   - Head: title "Bộ lọc" + nút "Xóa bộ lọc" (text button, màu primaryDark).
   - 4 nhóm filter (mỗi nhóm: label 12px + danh sách option checkbox vuông 16px + số đếm từng mục, phân cách bằng border-top `#EAE8E4`):
     - **Địa điểm**: Tất cả (3) / Bắc Ninh (2) / Bắc Giang (1)
     - **Ca làm**: Tất cả (3) / HC (1) / D1 (2) / D2 (1) / N1 (1) / T1 (1)
     - **Loại hình**: Tất cả (3) / Nhà máy (2) / Kho vận (1)
     - **Trạng thái tuyển**: Tất cả (3) / Tuyển gấp (1) / Đang tuyển (1) / Đã nhận đủ (1)
3. **Filter hoạt động client-side thật** (React state, không DB):
   - Chọn 1 mục/nhóm → chỉ card khớp hiển thị; "Tất cả" = default checked mọi nhóm.
   - "Xóa bộ lọc" reset toàn bộ về Tất cả.
   - Số đếm từng mục là số thật tính từ data (không hardcode số nếu dễ — tính từ `listPublicJobs()`).
4. Được phép thêm field hỗ trợ filter vào `PublicJobCard`/`listPublicJobs()` trong `packages/job-board/src/index.ts` (vd `province: 'BAC_NINH' | 'BAC_GIANG'`, `type: 'NHA_MAY' | 'KHO_VAN'`) — **additive, KHÔNG đổi số liệu canonical** (50/47/3, 80/80/0, 35/32/3) và KHÔNG đổi tên/mã project.
5. Responsive <900px: panel co lại hoặc nằm trên grid (không vỡ layout).
6. Dùng đúng tokens Warm Professionalism đã có trong `app/globals.css` (mở rộng class `.filter-panel`, `.fopt`, `.fcheck`... theo mockup — KHÔNG bịa màu mới, KHÔNG inline style màu). Icon check dùng lucide-react (đã có) — KHÔNG thêm dependency mới.

## Cấm tuyệt đối (như mọi round)

- KHÔNG đụng `appBCC/` (khu vực sếp đang sửa: `agent_mapper.py`, `app.py` — không stage, không stash).
- KHÔNG đọc/commit `.env`, chuỗi chứa `npg_`, `postgres://`, password, token.
- KHÔNG prisma migrate gì hết (round này không đụng DB).
- KHÔNG `git add -A`/`git add .` — chỉ add đúng file sửa.
- KHÔNG đổi logic/data ngoài phạm vi STEP-10; `revalidate = 300` giữ nguyên; không auth.
- KHÔNG sửa TASK.md / AUDIT.md / PLANNER-DECISION.

## Bàn giao

- Sửa đúng file cần (dự kiến: `app/job-board/page.tsx`, `app/globals.css`, `packages/job-board/src/index.ts` nếu thêm field).
- Verify: `npx tsc --noEmit` exit 0, `npm run build` exit 0, `npx vitest run` không đỏ (có test job-board thì cập nhật nếu cần — test mới cho filter nếu có sẵn pattern).
- Commit message tiếng Việt không dấu, prefix `feat(job-board):`, push origin main.
- Cập nhật `docs/tasks/hrp-phase0-foundation/HANDOFF.md` (template `.ai-pipeline/templates/HANDOFF.template.md`): Execution Trace + evidence AC-12 + deviation/BLK nếu có.
- Kết thúc bằng `Handoff status: READY_FOR_AUDIT` (hoặc `BLOCKED` + lý do).
