# Tier 0 review — TASK B v1.0 (`hrp-v6-ui-04b-pagination-admin`)

Ngày: 10/09/2026. Reviewed HEAD: `d3add63` (sau TASK A `ACCEPTED`).

## 0. Tóm tắt Tier 1 nộp

TASK B v1.0 ở `docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md`. Verify-task DRAFT-VALID (1 warning A-04 DRAFT non-blocking). Lane CRITICAL, audit DEEP. 19 AC, 11 STEP, 15 RQ traceable.

## 1. Outcome Tier 1 đề xuất

- BestJobs tab `Tất cả` + `Tuyển gấp` filter `urgency === 'URGENT'`
- BestJobs pagination prev/next + range "Trang X / Y" (đổi từ sentinel load-more → prev/next cho BestJobs; homepage search giữ sentinel per B9)
- `/api/jobs` mở `urgency=URGENT` query + tie-breaker `postedAt desc + id desc`
- Schema `HomepageSettings` ADD-only với CHECK constraint `id = 'default'`
- `GET /api/admin/homepage-settings` (public projection) + cache `unstable_cache` tag `homepage-settings` + TTL 60s
- Permission `CAN_EDIT_HOMEPAGE_SETTINGS` group SYSTEM + seed ADMIN (catalog 10 → 11 codes)
- View-model `HomepageSettingsView { source: 'REAL' | 'INTEGRATION_PENDING', settings, defaultBestJobsPageSize: 9, defaultListingPageSize: 12 }`
- Plan B KHÔNG viết Admin settings page + write API — sang Plan Admin V6 AV1 implementation task (Tier 1 lập AV1-TASK sau verify contract Plan B)

## 2. Câu hỏi Tier 0 cần trả lời

### 2.1. Outcome chấp thuận các quyết định B1–B11 không?

- **B1** Tab `Tất cả` + `Tuyển gấp` ✅
- **B2** Filter URGENT chỉ (KHÔNG bao gồm CLOSING) ✅
- **B3** Pagination prev/next thay trang ✅
- **B4** Mở scope `/api/jobs?urgency=URGENT` trước pagination ✅ (Tier 0 chỉ thị `không mở public service/API mới trong UI chỉ vì quyết định B4 lịch sử` — Tier 1 đề xuất vẫn mở vì cần cho `Tuyển gấp` filter; nếu Tier 0 muốn giữ INTEGRATION_PENDING cho filter, Tier 1 sẽ đổi state sang client-side filter trên đã fetch đủ)
- **B5** Page size default 9 ✅
- **B6** Range `{3, 6, 9, 12}` ✅
- **B7** Listing page size default 12 ✅
- **B8** Range integer `[6..50]` ✅
- **B9** Homepage search giữ append/load-more (sentinel), BestJobs đổi sang prev/next ✅
- **B10** Schema `HomepageSettings` singleton + invariant DB (CHECK constraint) ✅
- **B11** Permission ADMIN (dùng permission-resolver hiện có, server-side enforce) ✅

### 2.2. Có phá ranh giới hai plan không?

Tier 1 thu hẹp đúng theo Tier 0 review TASK A §1:
- **Schema + write API + Admin page** → sang Plan Admin V6 AV1 (Tier 1 KHÔNG viết 3 thứ này trong Plan B).
- **Plan B sở hữu**: UI controls (tab, pagination), view-model `INTEGRATION_PENDING`, read API `GET /api/admin/homepage-settings` (public projection), `/api/jobs?urgency` extension, schema `HomepageSettings` ADD-only, permission catalog + seed.
- Plan B là "read-side + UI integration" của AV1 — AV1 implementation sẽ thêm POST + Admin page + revalidateTag.

### 2.3. Baseline + environment

- Source reference = `d3add63` (TASK A `ACCEPTED`). UI-03 source reference `4d9a633` vẫn áp dụng cho field parity.
- Execution HEAD đo ngay trước STEP-01 bằng `git rev-parse HEAD` → `evidence/exec-head-before.txt` ✅
- Expected unit failure set capture tại exec-head-before ✅

### 2.4. Tier 1 sở hữu TASK.md canonical; Tier 2 sở hữu HANDOFF + evidence + source/test allowlist ✅

Khóa `docs/tasks/hrp-v6-ui-04b-pagination-admin/**`. Tier 2 KHÔNG sửa plan cha `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/**`.

### 2.5. Sửa contract giới hạn nếu có

Tier 0 sẽ chấp thuận hoặc yêu cầu sửa:

1. **BestJobs fetch riêng qua `/api/jobs`**: Tier 1 đề xuất đổi từ `overview.newest.slice(0, 3)` → fetch riêng. Lý do: cần `urgency` filter + pageSize từ settings. Nếu Tier 0 muốn giữ `overview.newest` thì Plan B không có fetch URGENT — Tier 1 sẽ đổi sang client-side filter trên overview.

2. **B4 (mở `/api/jobs?urgency=URGENT`)**: Nếu Tier 0 giữ verdict `không mở public service/API mới trong UI`, Tier 1 sẽ dùng client-side filter trên `overview.newest` (giả định URGENT đã được compute sẵn trong service) — không cần thêm query param.

3. **Sentinel vs prev/next cho BestJobs**: Tier 1 đề xuất đổi BestJobs từ sentinel → prev/next (Plan B9 tách rõ). Nếu Tier 0 muốn giữ sentinel cho BestJobs để đồng nhất với homepage search, Tier 1 sẽ ghi chú BestJobs là sentinel-based, prev/next cho listing.

4. **Plan B viết `GET /api/admin/homepage-settings` read-only** — không phải admin write. Nếu Tier 0 muốn đẩy luôn read API sang AV1 thì Plan B chỉ là UI controls + view-model INTEGRATION_PENDING. Tier 1 sẽ chuyển read API sang AV1 implementation task.

## 3. Gate & AC

- AC-01..AC-02: Schema ADD-only + migration no DROP
- AC-03: Permission catalog + seed
- AC-04..AC-05: Service + read API
- AC-06..AC-08: `/api/jobs?urgency` filter + tie-breaker + limit clamp
- AC-09..AC-14: Tab + pagination + view-model fallback + ARIA
- AC-15: Truth fence (changed public surface)
- AC-16..AC-17: Fence tests + regression shell
- AC-18: Mandatory gates (typecheck, test:unit, build, prisma validate/migrate diff/generate, verify-task, verify-handoff)
- AC-19: AWAITING_OWNER_LIVE_VISUAL_REVIEW (DEC-18)

## 4. Authorization sau sửa

Tier 0 verdict dự kiến:
- **PASS** (v1.1 `READY_FOR_EXECUTION`): Tier 2 thi công trong scope đã chốt
- **REVISION_REQUIRED**: Tier 1 sửa đúng nhóm Tier 0 chỉ, bump v1.1
- **SCOPE_CREEP**: Tier 1 mở rộng Plan B sang admin write API hoặc settings page (cần chuyển sang AV1 implementation task riêng)

Sau khi Tier 0 chốt: Tier 1 commit + push TASK.md B (canonical) + plan-overview.md update nếu cần. Không giao Tier 2 cho tới khi TASK B `READY_FOR_EXECUTION`.

## 5. Reference

- TASK B v1.0: `docs/tasks/hrp-v6-ui-04b-pagination-admin/TASK.md`
- Skeleton: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/skeleton-B-C-D.md` §TASK B
- Field matrix: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/field-matrix.md` §6–§9
- Plan Admin V6 mapping: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-admin-v6.md` §2 AV1
- Tier 0 chỉ thị gốc: `docs/prompts/TIER0_UI04_OWNER_DECISIONS_AND_HOME_CONTENT.md`
- Tier 0 review TASK A: `docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/tier0-review-task-a-v1.md`
- TASK A `ACCEPTED` HEAD: `d3add63`
