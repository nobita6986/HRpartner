# TASK — hrp-admin-portal-vietnamese-localization-audit (T1B)

> Document status: ACTIVE TASK
> Outcome owner: T0/Owner
> Delivery: T1B (Delivery Lead)
> Tier 3: not invoked (Audit mode = NONE)
> Protocol: V2_FAST_FREEZE
> Lane: FAST
> Audit mode: NONE
> Implementation SHA: N/A (docs-only audit; no source/test/migration touched)
> Baseline (audit SHA): `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (`origin/main`, post-merge PR #93)
> Branch: `codex/t1b-admin-portal-vietnamese-localization-audit`
> Date: 2026-10-04
> Supersedes: none
> Conflict rule: docs-only audit, not a normative contract. V7/V8/V9 authority,
> `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, the maintainability reference,
> M2A `RESOLVED` boundaries (F11) and current source override any claim made here.

## 0. Outcome (from T0 directive)

Khảo sát toàn bộ giao diện Admin Portal, lập inventory đầy đủ những nội dung
tiếng Anh / thuật ngữ kỹ thuật đang hiển thị cho người dùng và đề xuất kế hoạch
Việt hóa nhất quán, dễ hiểu. Đây là bước bắt buộc trước P2.1.

## 1. Boundary (do / don't)

### Được làm (in-scope, docs-only)

- Khảo sát toàn bộ giao diện Admin Portal (`app/admin/**`, `app/admin/_components/**`,
  `src/shared/ui/role-guard/**` và shared component được import).
- Khảo sát `src/domains/**` component được render trong Admin Portal.
- Khảo sát user-facing error mapper và API error code thực sự được Admin UI hiển thị.
- Khảo sát admin navigation configuration, page metadata, breadcrumb, table,
  form, badge, dialog, empty state, tooltip, aria-label, help text, date/time/status
  presentation.
- Lập inventory file:line chính xác.
- Phân loại từng finding theo taxonomy T0 §D.
- Đề xuất glossary, architecture, waves, file ownership, test strategy, acceptance
  criteria, rollback boundary, production verification, dependency với UI2 / Mốc 3–5
  / P2.1.
- Xuất 3 tài liệu:

  1. `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_AUDIT.md`
  2. `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md`
  3. `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md` (file này)

### Không làm (out-of-scope)

- Không sửa source / test / schema / migration.
- Không đổi canonical database enum / API field.
- Không đổi lifecycle / auth / RLS / permission.
- Không dịch ID, code, slug value hoặc user-entered data.
- Không dọn dẫn liệu production.
- Không làm UI2, media, Mốc 3/4/5 hoặc P2/AFF.
- Không merge/deploy.
- Không đăng nhập hoặc thay đổi production data.
- Không biến audit thành dự án multi-language nếu Owner chỉ yêu cầu
  Vietnamese-first.
- Không tạo fixture thật.
- Không chạy static test, CI, build, deploy workflow.
- Không re-invoke Tier 3.
- Không chạm PR #92, branch UI V1, M2A/M2B/ER/AFF history.

## 2. Phân loại finding (taxonomy) — lấy từ T0 §D

| Code | Ý nghĩa |
|---|---|
| `TRANSLATE_NOW` | Nội dung tiếng Anh mà người vận hành nhìn thấy và có thể dịch an toàn. |
| `VIETNAMESE_WITH_TECHNICAL_HINT` | Tiếng Việt làm label chính; có thể giữ thuật ngữ kỹ thuật trong ngoặc / help text (ví dụ `Đường dẫn tin (slug)`). |
| `KEEP_CANONICAL_IDENTIFIER` | Không dịch giá trị kỹ thuật thực: ID, code, URL slug value, API field, database enum, symbol, log, migration, idempotency key. |
| `DATA_CONTENT_NOT_UI_COPY` | Nội dung do người dùng / fixture / dữ liệu test nhập. Nếu phát hiện test fixture trên production, ghi thành finding vận hành riêng, không trộn với localization. |
| `OWNER_DECISION_REQUIRED` | Thuật ngữ nghiệp vụ có nhiều cách dịch và có thể thay đổi cách hiểu. |

## 3. Kế hoạch khảo sát (execution)

### Bước 1 — Inventory theo 4 luồng song song, không giao file

- **Luồng A — Admin module index / shell / nav / role-guard**:
  `app/admin/layout.tsx`, `app/admin/admin-shell.tsx`, `app/admin/page.tsx`,
  `app/admin/_components/**`, `src/shared/ui/role-guard/role-guard-layout.tsx`,
  `src/shared/ui/role-guard/active-nav-helper.ts`, `src/shared/ui/navigation/**`.
  Output: route map + sidebar/nav terminology + admin shell branding.

- **Luồng B — Recruitment domain screens**:
  `app/admin/clients/**`, `app/admin/projects/**`, `app/admin/staffing/**`,
  `app/admin/staffing-orders/**`, `app/admin/job-openings/**`,
  `app/admin/jobs/**`, `app/admin/applications/**`.
  Output: terminology in this surface + status/action vocabulary + table labels.

- **Luồng C — Workforce / partner / supporting screens**:
  `app/admin/labor-profiles/**`, `app/admin/recruiter-workbench/**`,
  `app/admin/workers/**`, `app/admin/vendors/**`, `app/admin/users/**`,
  `app/admin/tickets/**`, `app/admin/attendance/**`, `app/admin/payroll/**`,
  `app/admin/commission/**`, `app/admin/reconciliation/**`,
  `app/admin/media/**`, `app/admin/settings/**`.
  Output: terminology in this surface + status/action vocabulary + table labels.

- **Luồng D — Shared UI / dictionary / error mapper**:
  `src/shared/ui/**` (sub-tree except `role-guard` / `navigation` đã giao A),
  `src/domains/**` component used by Admin (qua import graph),
  user-facing error mapper `src/shared/observability/**`,
  API error codes từ `app/api/**` rendered bởi Admin UI.
  Output: shared formatter state, error mapper, raw API leakage.

Mỗi luồng output file:line + taxonomy code + evidence quote ≤ 200 chars.
Luồng độc lập về file ownership, có thể chạy song song dưới sub-agent. Tier 1
là integrator duy nhất.

### Bước 2 — Glossary proposal & architecture

- Bảng English/canonical → candidate Vietnamese (T0 §E + đối chiếu code).
- Đề xuất formatter/dictionary pattern không thêm dependency.
- Phân biệt: Project publish ≠ JobPosting publish; JobOpening ≠ JobPosting;
  StaffingOrder ≠ Project; CandidateSubmission ≠ LaborProfile; canonical
  enum không đổi, label tiếng Việt thay đổi.

### Bước 3 — Implementation waves (T0 §H)

| Wave | Phạm vi | File ownership | T1 có thể chạy song song? |
|---|---|---|---|
| 1 | Shared glossary / status / action formatter + nav/common shell. | `src/shared/ui/i18n/**` (NEW), `src/shared/format/**` (NEW), `src/shared/ui/role-guard/**` (chỉ terminology). | T1A được nếu nav không giao với T1B; T1C được nếu không chạm F11. |
| 2 | Recruitment high-traffic: Project, StaffingOrder, JobOpening, JobPosting, Applications. | `app/admin/clients/**`, `app/admin/projects/**`, `app/admin/staffing/**`, `app/admin/staffing-orders/**`, `app/admin/job-openings/**`, `app/admin/jobs/**`, `app/admin/applications/**`. | Mutating agents chỉ song song khi tách được theo module. |
| 3 | Workforce/partner/system: LaborProfile, Placement, Clients, Vendors, Users, Settings, Media. | `app/admin/labor-profiles/**`, `app/admin/workers/**`, `app/admin/vendors/**`, `app/admin/users/**`, `app/admin/recruiter-workbench/**`, `app/admin/tickets/**`, `app/admin/commission/**`, `app/admin/reconciliation/**`, `app/admin/media/**`, `app/admin/settings/**`, `app/admin/attendance/**`, `app/admin/payroll/**`. | Có thể chia T1A/T1B/T1C theo module. |
| 4 | Error / validation / accessibility copy + static fence. | `src/shared/observability/**`, `src/shared/format/**`, `app/api/**` (chỉ error envelope mapping). | T1C ưu tiên. |
| 5 | Production visual walkthrough desktop + mobile. | Production-only; không ghi source. | N/A — Owner thực hiện. |

### Bước 4 — Test strategy (T0 §F.6)

1. **Source/static fence** — vitest `.static.test.ts` đặt gần file đã đổi
   (mẫu: `admin-jobs-terminology.static.test.ts`).
2. **Component render test** — cho component i18n wrapper / formatter mới.
3. **Route/page smoke** — gọi lại route đã đổi; so snapshot tiếng Việt.
4. **Glossary consistency** — static check enum label mapping (`'ACTIVE' →
   'Đang hoạt động'`) có dùng chung một source-of-truth, không phải mỗi
   page dịch một kiểu.
5. **Forbidden-English allowlist** — danh sách chuỗi tiếng Anh **được phép
   xuất hiện** (canonical identifier, KEEP_CANONICAL_IDENTIFIER), danh sách
   chuỗi tiếng Anh **cấm** (raw enum status, raw action, raw error code).
6. **Vietnamese first pass** — quét `app/admin/**` xem tỉ lệ câu tiếng Việt
   ≥ ngưỡng Owner chốt (đề xuất ≥ 95% trên route Admin ưu tiên).

### Bước 5 — Acceptance criteria cho mỗi wave

- Targeted test PASS.
- `git diff --check` sạch.
- Strict UTF-8 no BOM, LF-only.
- Không secret/credential/PII.
- Không đổi canonical enum/API field/lifecycle/auth/RLS.
- Không phá vỡ M2A F11 boundary (`/admin/jobs` Project-level publish
  giữ `Công bố dự án`; JobPosting editor giữ `Publish`).

### Bước 6 — Pre-P2 binding (T0 §I)

- Audit docs có thể merge song song với UI2 / F6.
- Không implement trong round này.
- P2.1 chưa bắt đầu trước khi:
  1. T0 duyệt glossary + execution plan;
  2. các wave localization đã merge;
  3. production walkthrough PASS;
  4. không còn raw English/status trên các route Admin ưu tiên;
  5. debt còn lại liệt kê và Owner chấp nhận bằng văn bản.

## 4. Verification (T0 §K)

- Changed files chỉ gồm 3 tài liệu khai báo.
- Mọi file:line reference resolve trên baseline `f570db06`.
- Relative links resolve.
- Strict UTF-8 no BOM, LF-only.
- `git diff --check` sạch.
- Không secret/credential/PII.
- PR docs-only, non-draft.
- Chờ CI 4/4 GREEN.
- Dừng trước merge để T0 review glossary + thứ tự implementation.

## 5. Owner decisions cần mở

1. **Project publish** giữ `Công bố dự án` (M2A F11 đã chốt, không mở lại) hay đổi sang `Đăng dự án`?
2. **JobPosting** label chính:
   - "Tin tuyển dụng" (Vietnamese-first) hay giữ `JobPosting` (canonical)?
3. **JobOpening** label chính: "Đợt tuyển dụng" / "Vị trí đang tuyển" / giữ `JobOpening`.
4. **StaffingOrder** label chính: "Nhu cầu tuyển dụng" / "Yêu cầu cung ứng" / "Đơn hàng".
5. **StaffingOrderSlot**: "Vị trí cần tuyển" / "Chỉ tiêu tuyển dụng".
6. **LaborProfile**: "Hồ sơ người lao động" / "Hồ sơ lao động".
7. **CandidateSubmission**: "Đơn ứng tuyển" / "Hồ sơ ứng tuyển".
8. **Project Assignment**: "Phân công dự án" / "Phân công vào dự án".
9. **Placement**:
   - "Bố trí việc làm" / "Đặt chỗ" / "Sắp xếp công việc".
   - Trạng thái: `SELECTED → CONFIRMED → EFFECTIVE` dịch thế nào?
10. **i18n architecture**: giữ typed dictionary (không thêm dependency) hay
    adopt `next-intl` / `react-intl`?
11. **Status enum hiển thị tiếng Việt nhưng canonical enum phía dưới giữ
    nguyên** — Owner confirm.
12. **Raw enum/error code có hiển thị trong production** hay Owner chấp nhận
    technical hint `(slug)` / `(placement_id)`?

## 6. Risk authority

T0/Owner duyệt glossary + execution plan trước khi wave 1 mở.
Tier 1 chỉ commit docs-only artifacts trong round này.

## 7. Handback contract

Báo cáo cho T0 (theo T0 §L):
1. baseline/latest-main reconciliation
2. route/file coverage
3. tổng số finding
4. module có nhiều English leakage nhất
5. top 20 thuật ngữ cần chốt
6. recommended glossary
7. implementation waves
8. parallelization T1A/B/C
9. exact changed files
10. commit/PR/CI
11. remaining Owner decisions
