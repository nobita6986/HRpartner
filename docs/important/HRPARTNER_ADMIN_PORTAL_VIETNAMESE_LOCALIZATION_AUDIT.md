# HRPartner — Admin Portal Vietnamese Localization Audit (T1B)

> Document status: NON-AUTHORITATIVE AUDIT REPORT
> Measured against `main` SHA: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (post-merge PR #93)
> Branch: `codex/t1b-admin-portal-vietnamese-localization-audit`
> Date: 2026-10-04
> Owner: T0 (glossary approval) + T1B (this audit, docs-only)
> Supersedes: none
> Companion artifact: `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md`
> Companion task: `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md`
> Conflict rule: this is an audit, not a normative contract. V7/V8/V9 authority, `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, the maintainability reference, M2A `RESOLVED` boundaries (F11), and current source override any claim made here. If a finding disagrees with current source, source wins.

## 0. Purpose and non-authority statement

This audit answers T0's T1B directive:

> Khảo sát toàn bộ giao diện Admin Portal, lập inventory đầy đủ những nội dung tiếng Anh / thuật ngữ kỹ thuật đang hiển thị cho người dùng và đề xuất kế hoạch Việt hóa nhất quán, dễ hiểu.

It does NOT answer:

- "Which Vietnamese label is correct for X?" — that belongs to T0/Owner glossary sign-off in the companion execution plan §3.
- "Which wave ships first?" — that is the companion execution plan §5.
- "Should the codebase adopt `next-intl`?" — that is the execution plan §4.
- "Should we merge UI V1, M2A F11, AFF, or Mốc 3/4/5 changes?" — out of scope per T0 §J.

The audit gives Owner (a) the inventory and file:line evidence, (b) the classification per T0 §D taxonomy, (c) the priority ordering, and (d) the explicit boundary for any future T1A/T1B/T1C correction batch.

## 1. Authority order

| Concern | Authority |
| --- | --- |
| Domain / architecture | `docs/V7/V7_ARCHITECTURE.md`, `docs/V7/HRP_V6_PLUS_V7_MASTER_INDEX.md` |
| Execution / go-live gates | `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` |
| Localization glossary approval | T0 (this audit + companion execution plan) |
| Coding rules | `docs/V7/AI_CODING_GUARDRAILS.md`, `.ai-pipeline/`, current TASK/HANDOFF |
| M2A F11 boundary | `docs/important/HRPARTNER_OPERATIONAL_WORKFLOW_DEBT_AUDIT.md` §8.11; frozen by `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` |
| Process / audit method | `.ai-pipeline/README.md`, `tier1.md` (Tier 1 = Delivery Lead), this audit's `Section 3` |

This audit must NOT be used as a second source of truth for V7 invariants, P0/P1/P2/P3 priority order, or production verification. Each finding cites a UI source location and a route/service source location so a future T1 batch can verify scope and dismiss false positives against the current source before opening a contract.

## 2. Method, scope, and evidence rules

### 2.1 Method

1. **Baseline pin**: `git rev-parse origin/main` at audit start = `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (PR #93 merge-commit; re-confirmed at audit write time).
2. **Source priority order**:
   - UI source under `app/admin/**` and `src/shared/ui/**`.
   - Route/service under `app/api/**` and `src/domains/**`.
   - Sidebar/IA configuration under `src/shared/ui/role-guard/role-guard-layout.tsx`.
   - Shared dictionaries under `src/domains/<module>/<module>-ui.ts`.
3. **Three-direction walk per finding**:
   - UI string → dictionary lookup (does a `STATUS_LABELS`/`CONFLICT_LABELS` entry exist?).
   - UI string → route/service code (does the canonical enum still echo in the response?).
   - Sidebar/IA configuration → operator-facing role scope (does the operator see the un-translated label?).
4. **Five-bucket classification** (T0 §D):
   - `TRANSLATE_NOW` — operator-facing English copy that can be translated safely without contract change.
   - `VIETNAMESE_WITH_TECHNICAL_HINT` — Vietnamese primary label + canonical/technical token in parens or tooltip (e.g. `Đường dẫn tin (slug)`).
   - `KEEP_CANONICAL_IDENTIFIER` — never translate: ID, code, URL slug value, API field, database enum value, symbol, log line, migration, idempotency key.
   - `DATA_CONTENT_NOT_UI_COPY` — user-entered / fixture / test data; if found on production, raise an operational finding, never bundle with localization.
   - `OWNER_DECISION_REQUIRED` — business terms with multiple valid translations where Owner (not Team) must pick. After this audit round is signed off by T0, all 27 binding Owner decisions are recorded in §8; `OWNER_DECISION_REQUIRED` only applies to residual brand / subtitle / out-of-scope copy that T0 did not bind (e.g. L-005 brand title).
5. **Diacritic-missing sub-finding (NEW category raised by this audit)**: `VIETNAMESE_DIACRITIC_MISSING` — Vietnamese string that lost its diacritics in the source file (e.g. `Huy` instead of `Hủy`, `Dang` instead of `Đang`, `tao` instead of `tạo`). The audit documents the missing-diacritic symptom only; **no causal claim** is made about how it was introduced (PowerShell BOM, codepage typo, copy-paste from a transliteration pipeline, etc.). These degrade the Vietnamese-first UX and MUST be flagged in the same delivery waves. If a real U+FFFD / mojibake / UTF-8 BOM defect is found with byte evidence, it MUST be raised as a separate encoding finding (e.g. `ENCODING_DEFECT`); it MUST NOT be mixed into the `VIETNAMESE_DIACRITIC_MISSING` bucket.

### 2.2 Scope

Mandatory surface:

- `app/admin/**` (admin routes, layouts, page-level components)
- `app/admin/_components/**` (admin-only shared widgets)
- `src/shared/ui/role-guard/**` (sidebar/IA + admin shell branding)
- Shared components imported by `app/admin/**` (transitive)
- `src/domains/**` components rendered in Admin Portal
- User-facing error mapper and API error codes consumed by Admin UI
- Admin navigation configuration
- Page metadata, breadcrumb, table, form, badge, dialog, empty-state, tooltip, aria-label, help text, date/time/status presentation

Out-of-scope per T0 §J (mentioned here so future readers do not re-scope this audit):

- Worker Portal (`app/m/**`) — out of scope unless the dictionary exports in `src/domains/...` cross over.
- Vendor Portal (`app/vendor/**`) — out of scope.
- Public site (`app/viec-lam/**`, `app/(public)/**`) — out of scope.
- APIs/routes under `app/api/**` for non-admin callers — out of scope unless the same error envelope appears in admin.
- DB enum migration / canonical value rename — out of scope per T0 §J.

### 2.3 Evidence format

Each finding carries:

- **ID** — sortable, e.g. `L-001`.
- **Module / route** — `app/admin/jobs` style.
- **file:line** — exact source location.
- **Evidence quote** — ≤ 200 chars.
- **Taxonomy** — one of the 5 buckets above.
- **Severity** — `P0`, `P1`, `P2`, `P3` (definitions below).
- **Suggested action** — translation literal OR Owner decision reference.
- **M2A F11 collision check** — `OK` / `RISK` if the suggested change touches the frozen `Công bố dự án` / `Bỏ công bố dự án` boundary.

**Severity definitions (revised; T0 binding)**:

- `P0` — operator **cannot** complete a workflow, OR there is **evidence of a high-risk mistaken action** (wrong project published / unpublished, wrong status transitioned, irreversible side-effect triggered). Reserved for findings with concrete operational evidence. **Raw English / raw canonical-enum rendering alone is NOT P0** — it is P1 (visible English in a core route).
- `P1` — operator-visible English copy in a core Admin route (sidebar, list, detail, primary form, status badge, primary action). Includes raw canonical-enum values rendered as label.
- `P2` — operator-visible English copy in a secondary route, technical-hint copy, tooltip, placeholder, secondary action, encoding/diacritic defect on a non-blocking element.
- `P3` — branding / footer / out-of-scope surfaces (e.g. cross-portal subtitle visible only via role-impersonation; brand subtleties).

This audit applies the revised definitions across the entire ledger (§5) and the summary (§7).

### 2.4 Coverage limitations

1. **No runtime exercise**: this audit is purely static against the source tree at `f570db06`. No dev server was started, no synthetic HR_STAFF session was replayed, no screenshot diff was captured.
2. **No dictionary merge review**: the existing dictionaries (`placement-ui.ts`, `job-posting-error-map.ts`, `recruiter-assignment-manager.tsx:319-326` `STATUS_CONFIG`, `workers/page.tsx:24-29`, `projects/page.tsx:27-32`) were inventoried, not refactored. A future T1 batch must verify that consolidation does not break the F11 frozen contract.
3. **No vendor portal cross-reference**: the audit skips `app/vendor/**` per T0 §J. If Owner ever extends the localization to the vendor portal, the same dictionaries will apply.
4. **Diacritic-missing findings are best-effort**: the audit identifies the missing-diacritic symptom by visual / codepoint inspection. A future T1 batch should run targeted Vitest / static source tests against the changed surface (forbidden-literal lists + allowlist + dictionary exhaustiveness), not a heuristic regex (e.g. matching `Huy`) which would false-positive on Vietnamese proper names, user-entered data, or canonical identifiers.
5. **No production screenshot diff**: the Owner-provided PNG evidence (`codex-clipboard-*.png`) was not parsed by this audit; the audit used the screenshots as confirmation that the static findings match the live UI, not as the primary source.

## 3. Existing localization architecture (audit findings on what is already there)

### 3.1 Existing typed dictionaries (gold-standard patterns)

These modules already follow the pattern this audit recommends for Wave 1. They are not findings — they are templates.

| Module | File | Exports | Coverage |
| --- | --- | --- | --- |
| Applications / Placement | `src/domains/applications/placement-ui.ts:21-95` | `STATUS_LABELS`, `SOURCE_LABELS`, `ACTION_LABELS`, `CONFLICT_LABELS`, `conflictLabel()`, `availableActions()`, `OVERRIDE_CASE_LABELS` | 8 status values, 3 source values, 5 actions, 16 conflict codes, 3 override cases |
| Staffing / JobPosting errors | `src/domains/staffing/job-posting-error-map.ts:69-103, 110-115` | `JOB_POSTING_ERROR_LABELS`, `JOB_POSTING_RECOVERY_HINTS`, `JOB_POSTING_UNKNOWN_ERROR_LABEL`, `summarizeJobPostingApiError()`, `jobPostingErrorLabel()` | 11 error codes + 1 unknown fallback + 1 recovery hint |
| Staffing / Recruiter assignment | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx:326-330` | `STATUS_CONFIG` (inline) | 3 status values |
| Projects | `app/admin/projects/page.tsx:27-32` | `STATUS_CONFIG` (inline) | 5 status values |
| Workers | `app/admin/workers/page.tsx:24-29` | `STATUS_CONFIG` (inline) | 4 status values |
| Recruitment next-action | `app/admin/recruiter-workbench/_components/NextActionBadge.tsx:24-33` | `ACTION_META` (inline) | 7 next-action values |

**Audit note (G)**: the project already answers the question "do we need `next-intl`/`react-intl`?" with a clear **NO** — typed dictionaries + role-gated `NavItem` arrays are the established pattern. Any new module should extend this pattern; the execution plan §4 codifies the convention.

### 3.2 Existing frozen contracts (must NOT be altered by Wave 1+)

| Contract | File | Boundary |
| --- | --- | --- |
| Project publish = `Công bố dự án` / `Bỏ công bố dự án` | `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` (static fence) + `app/admin/jobs/page.tsx:371` | F11 RESOLVED; no rename |
| JobPosting editor = `Publish` / `Unpublish` / `Archive` (historical state at T1A HANDOFF SHA `162453e29f3e2a882cda17e56d3578e1038b72bf`) | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | **Historical state — superseded by T0 §2 #2 binding.** The canonical lifecycle operation names (`Publish` / `Unpublish` / `Archive`) remain canonical API keys and server handler names; they are NEVER renamed. The operator-facing **display labels** adopt the T0 §2 #2 binding (`Đăng tin` / `Gỡ tin` / `Lưu trữ`) on the editor shell and every other surface. |
| 7-value `ServerDerivedNextAction` map | `app/admin/recruiter-workbench/_components/NextActionBadge.tsx:24-33, 38-50` | Exhaustive TypeScript check; adding/removing values MUST break the build |
| Application lifecycle actions matrix | `src/domains/applications/placement-ui.ts:35-49` | Mirrors server gates |
| Permission resolver role mapping | `app/admin/admin-shell.tsx:26-39` (`SYSTEM_TO_UI_ROLE`) | Maps Prisma `SystemRole` → shared `Role`; no role widening |

### 3.3 Existing tests that already enforce localization

| File | What it asserts |
| --- | --- |
| `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` | The current assertions (`Công bố dự án` / `Bỏ công bố dự án` literal on `/admin/jobs` ; `Publish` / `Unpublish` / `Archive` preserved on the JobPosting editor) **do not** reflect the binding state under T0 §2 #2. Wave 2 MUST update this static test to assert:
- **`Project`** level: the ** `Công bố dự án` / `Bỏ công bố dự án` business-button literal** MUST appear on `/admin/jobs` Project-level actions (F11 frozen business-literal). The **`Publish` column header** MUST adopt `Công bố` (T0 §2 #1).
- **`JobPosting`** level: the `Đăng tin` / `Gỡ tin` / `Lưu trữ` Vietnamese display actions MUST appear on the editor shell; rendering the canonical lifecycle operation names `Publish` / `Unpublish` / `Archive` as operator-facing display labels is forbidden. Canonical names are permitted only as API request keys and as `value` / `aria` attributes. |
| `app/admin/recruiter-workbench/_components/RecruiterWorkbenchTable.test.ts` | Snapshot of all 9 column headers in Vietnamese. |
| `app/admin/recruiter-workbench/_components/NextActionBadge.test.ts` | All 7 `NEXT_ACTION_META.label` values render in Vietnamese. |
| `app/admin/recruiter-workbench/_components/ForbiddenPanel.test.ts` | Forbidden copy rendered in Vietnamese. |
| `app/admin/recruiter-workbench/_components/InvalidQueryPanel.test.ts` | Invalid-query copy rendered in Vietnamese. |
| `app/admin/recruiter-workbench/_components/HandlerChip.test.ts`, `PaginationControls.test.ts`, `FilterChips.test.ts`, `SortDropdown.test.ts`, `AgeCell.test.ts`, `PrimaryActions.test.ts` | Snapshot / behavioural coverage of the workbench widget copy. |
| `src/domains/staffing/job-posting-error-map.ts` (consumers in editor shell tests) | Frozen Vietnamese labels for every error code. |

**Audit note**: the recruiter-workbench subtree is the most consistent surface in the Admin Portal — it serves as the gold standard the execution plan §4 mandates every other surface to converge to.

## 4. Route / surface inventory

The audit walked **38 Admin routes** under `app/admin/**` plus the shared shell + sidebar. Each row links to the actual files inspected.

| # | Route | Surface | Findings density |
| ---: | --- | --- | --- |
| 1 | `/admin` (shell) | `app/admin/admin-shell.tsx`, `app/admin/layout.tsx` | M |
| 2 | `/admin` (sidebar) | `src/shared/ui/role-guard/role-guard-layout.tsx` | L |
| 3 | `/admin/projects` | `app/admin/projects/page.tsx` | L |
| 4 | `/admin/projects/[id]` | `app/admin/projects/[id]/page.tsx` | — |
| 5 | `/admin/jobs` | `app/admin/jobs/page.tsx` | **H** (matches Owner screenshot) |
| 6 | `/admin/jobs/job-postings` | `app/admin/jobs/job-postings/page.tsx` | **H** |
| 7 | `/admin/jobs/job-postings/[id]` | `app/admin/jobs/job-postings/[id]/page.tsx` | **H** |
| 8 | `/admin/jobs/job-postings/[id]/editor-shell` (client) | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | M (frozen contract) |
| 9 | `/admin/job-openings/[id]` | `app/admin/job-openings/[id]/page.tsx` | M |
| 10 | `/admin/staffing` | `app/admin/staffing/staffing-list-client.tsx` (+ page) | **H** |
| 11 | `/admin/staffing-orders` | `app/admin/staffing-orders/page.tsx` | — |
| 12 | `/admin/staffing-orders/[id]` | `app/admin/staffing-orders/[id]/page.tsx` + `recruiter-assignment-manager.tsx` | M |
| 13 | `/admin/applications` | `app/admin/applications/page.tsx` | L (gold-standard) |
| 14 | `/admin/labor-profiles` | `app/admin/labor-profiles/page.tsx` | L |
| 15 | `/admin/labor-profiles/new` | `app/admin/labor-profiles/new/page.tsx` | — |
| 16 | `/admin/labor-profiles/[id]` | `app/admin/labor-profiles/[id]/page.tsx` | M |
| 17 | `/admin/labor-profiles/[id]/handling-assignment-manager` | `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` | — |
| 18 | `/admin/workers` | `app/admin/workers/page.tsx` | L |
| 19 | `/admin/clients` | `app/admin/clients/page.tsx`, `[id]/page.tsx` | L (exemplary) |
| 20 | `/admin/vendors` | `app/admin/vendors/**` | — |
| 21 | `/admin/users` | `app/admin/users/page.tsx` | M (ROLE_LABELS inconsistency) |
| 22 | `/admin/media` | `app/admin/media/page.tsx`, `media-library-client.tsx` | M |
| 23 | `/admin/settings` | `app/admin/settings/page.tsx`, `admin-settings-form.tsx` | L |
| 24 | `/admin/tickets` | `app/admin/tickets/page.tsx` | L |
| 25 | `/admin/attendance` | `app/admin/attendance/page.tsx` | **H** + VIETNAMESE_DIACRITIC_MISSING |
| 26 | `/admin/payroll` | `app/admin/payroll/page.tsx` | L |
| 27 | `/admin/commission/policies` | `app/admin/commission/policies/page.tsx` | L (placeholder) |
| 28 | `/admin/commission/ledger` | `app/admin/commission/ledger/page.tsx` | L (placeholder) |
| 29 | `/admin/reconciliation` | `app/admin/reconciliation/page.tsx` | **H** + VIETNAMESE_DIACRITIC_MISSING (most severe) |
| 30 | `/admin/recruiter-workbench` | `app/admin/recruiter-workbench/page.tsx` + 8 components | L (gold-standard) |
| 31 | `/admin/_components/**` (shared widgets) | `app/admin/_components/**` | (mostly empty / placeholder) |

Distribution legend: **H** = high English density (≥ 6 findings), **M** = medium (3–5 findings), **L** = low (≤ 2 findings or all-Vietnamese).

## 5. Findings ledger (canonical)

Findings are grouped by route. Each row cites exact file:line, evidence quote, taxonomy, severity, and Owner-decision reference.

### 5.1 Sidebar / role-guard / admin shell (foundational)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-001 | `src/shared/ui/role-guard/role-guard-layout.tsx:130` | `{ href: '/admin/staffing', label: 'Staffing', ...}` | `TRANSLATE_NOW` (T0 binding) | P1 | `Nhu cầu tuyển dụng` (T0 §2 #4) |
| L-002 | `src/shared/ui/role-guard/role-guard-layout.tsx:447` | `Admin Portal` (subtitle under brand logo) | `TRANSLATE_NOW` | P3 | `Cổng quản trị` |
| L-003 | `src/shared/ui/role-guard/role-guard-layout.tsx:455` | `text-xs text-slate-500\">{role}</\>` (raw enum like `ADMIN`, `HR_MANAGER`) | `TRANSLATE_NOW` (T0 binding) | P2 | Vietnamese role label per shared dictionary; canonical enum preserved in tooltip / technical hint only (T0 §2 #3). |
| L-004 | `src/shared/ui/role-guard/role-guard-layout.tsx:464` | `user?.name ?? 'User'` | `TRANSLATE_NOW` | P3 | `'Người dùng'` |
| L-005 | `app/admin/admin-shell.tsx:53` | `brandTitle="HRP Admin"` | `OWNER_DECISION_REQUIRED` | P3 | Per Owner screenshot `HRP Admin` matches brand. Keep as-is OR add Vietnamese subtitle. |
| L-006 | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx:321` | `return '(no name)';` | `TRANSLATE_NOW` | P3 | `'(chưa có tên)'` |
| L-007 | `app/admin/labor-profiles/[id]/page.tsx:82` | `{data.identityVerification}` (raw `VERIFIED` / `PENDING` raw enum leakage to operator) | `TRANSLATE_NOW` (T0 binding) | P1 | `identityVerification` dictionary: `VERIFIED → 'Đã xác minh'`, `PENDING → 'Đang chờ xác minh'`, `REJECTED → 'Bị từ chối'` (T0 §2 #16) |
| L-008 | `src/shared/ui/role-guard/role-guard-layout.tsx:449` | `Worker App` (subtle subtitle for worker portal — out-of-scope but visible if admin user with cross-portal test) | `TRANSLATE_NOW` (out-of-scope but noted) | P3 | Out-of-scope; defer |
| L-009 | `app/admin/staffing-orders/[id]/recruiter-assignment-manager.tsx:326-330` | Inline `STATUS_CONFIG` for `ACTIVE`, `REVOKED`, `SUPERSEDED` | (template, not a finding) | — | Lift to `src/domains/staffing/recruiter-assignment-ui.ts` per Wave 1 §1 |

### 5.2 `/admin/jobs` (Project list — matches Owner screenshot)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-010 | `app/admin/jobs/page.tsx:319` | `<th>Project</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Dự án` |
| L-011 | `app/admin/jobs/page.tsx:320` | `<th>Code</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mã dự án` |
| L-012 | `app/admin/jobs/page.tsx:322` | `<th>Status</th>` | `TRANSLATE_NOW` | P1 | `Trạng thái` |
| L-013 | `app/admin/jobs/page.tsx:323` | `<th>Publish</th>` | `TRANSLATE_NOW` (T0 binding) | P1 | `Công bố` (per T0 §2 #1; F11 freeze no longer covers this column header — see §9) |
| L-014 | `app/admin/jobs/page.tsx:79-82` | `function StatusBadge({ status }: { status: string })` → `<span>{status}</span>` (renders raw `Published` / `Closed` / `Unpublished` because L351 hardcodes those English literals) | `TRANSLATE_NOW` | P1 (raw English enum in core route; operator can still read status) | Add `STATUS_CONFIG` for Project visibility: `Published → 'Đã công bố'`, `Unpublished → 'Chưa công bố'`, `Closed → 'Đã đóng'`; render `STATUS_CONFIG[status]?.label ?? status` |
| L-015 | `app/admin/jobs/page.tsx:351` | `job.isPublic ? 'Published' : job.status === 'CLOSED' ? 'Closed' : 'Unpublished'` | `TRANSLATE_NOW` | P1 (same root as L-014; reclassified per T0 severity definitions) | Same as L-014; feed Vietnamese label into the dictionary |
| L-016 | `app/admin/jobs/page.tsx:337` | `Chưa có job public nào.` | `TRANSLATE_NOW` | P2 | `Chưa có dự án công khai.` |
| L-017 | `app/admin/jobs/page.tsx:208` | `<Link href="/admin/jobs/job-postings">AV2 — Soạn JobPosting (bản nháp)</Link>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mở trang Tin tuyển dụng (bản nháp)` |
| L-018 | `app/admin/jobs/page.tsx:60-77` | `STATUS_COLORS` keys include `DANG_TUYEN`, `DA_NHAN_DU`, `NEW`, `QUALIFIED`, `SCREENING`, `REJECTED` (these are application statuses, not project statuses — wrong dictionary scope) | `KEEP_CANONICAL_IDENTIFIER` (application status enum values) | P1 (architectural drift; no workflow-blocking evidence — reclassified per T0 severity definitions) | Move `STATUS_COLORS` to `src/domains/applications/application-ui.ts` (Wave 2); leave project-status dictionary empty until Wave 2 |

### 5.3 `/admin/jobs/job-postings` (JobPosting list)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-019 | `app/admin/jobs/job-postings/page.tsx:193` | `<Link href="/admin/jobs" className="hover:underline">Admin Jobs</Link>` | `TRANSLATE_NOW` | P1 | `Danh sách nhu cầu` |
| L-020 | `app/admin/jobs/job-postings/page.tsx:196` | `<span>JobPosting authoring &amp; publish</span>` (breadcrumb) | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Tin tuyển dụng — soạn & đăng` |
| L-021 | `app/admin/jobs/job-postings/page.tsx:199` | `<h1>JobPosting — authoring &amp; publish</h1>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Tin tuyển dụng — soạn & đăng` |
| L-022 | `app/admin/jobs/job-postings/page.tsx:208` | `← Quay lại Admin Jobs` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `← Quay lại Danh sách nhu cầu` |
| L-023 | `app/admin/jobs/job-postings/page.tsx:230-233` | `<option key={s} value={s}>{s}</option>` (raw enum `DRAFT`, `PUBLISHED`, `ARCHIVED`) | `TRANSLATE_NOW` | P1 (raw enum in core route filter; operator can still filter — reclassified per T0 severity definitions) | Map through `JOB_POSTING_STATUS_LABELS` dictionary (`DRAFT → 'Bản nháp'`, `PUBLISHED → 'Đã đăng'`, `ARCHIVED → 'Đã lưu trữ'`); keep `value={s}` as canonical enum, only translate inner text |
| L-024 | `app/admin/jobs/job-postings/page.tsx:289-306` | `<th>Slug</th>`, `<th>Staffing Order</th>`, `<th>Status</th>`, `<th>Revision</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Đường dẫn tin (slug)`, `Nhu cầu tuyển dụng`, `Trạng thái`, `Phiên bản chỉnh sửa` |
| L-025 | `app/admin/jobs/job-postings/page.tsx:319` | `Chưa có JobPosting nào ở trạng thái ${statusFilter}` (raw enum echoed into the empty-state description) | `TRANSLATE_NOW` | P1 (raw enum echoed in empty-state description; non-blocking — reclassified per T0 severity definitions) | Map `${statusFilter}` through `JOB_POSTING_STATUS_LABELS` before interpolation |

### 5.4 `/admin/jobs/job-postings/[id]` (JobPosting detail)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-026 | `app/admin/jobs/job-postings/[id]/page.tsx:108` | `{ label: 'Admin Jobs', href: '/admin/jobs' }` (breadcrumb) | `TRANSLATE_NOW` | P1 | `Danh sách nhu cầu` |
| L-027 | `app/admin/jobs/job-postings/[id]/page.tsx:109` | `{ label: 'JobPosting viewer', href: '/admin/jobs/job-postings' }` (breadcrumb) | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Tin tuyển dụng — trang xem` |
| L-028 | `app/admin/jobs/job-postings/[id]/page.tsx:128` | `<Fact label="Slug" value={posting.slug} mono />` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Đường dẫn tin (slug)` |
| L-029 | `app/admin/jobs/job-postings/[id]/page.tsx:130` | `<Fact label="Revision" value={\`v${posting.revision}\`} />` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Phiên bản chỉnh sửa (revision)` |
| L-030 | `app/admin/jobs/job-postings/[id]/page.tsx:131` | `<Fact label="Created" ... />` | `TRANSLATE_NOW` | P2 | `Ngày tạo` |
| L-031 | `app/admin/jobs/job-postings/[id]/page.tsx:132` | `<Fact label="Updated" ... />` | `TRANSLATE_NOW` | P2 | `Ngày cập nhật` |
| L-032 | `app/admin/jobs/job-postings/[id]/page.tsx:135` | `<Fact label="Published at" ... />` | `TRANSLATE_NOW` | P2 | `Ngày đăng` |
| L-033 | `app/admin/jobs/job-postings/[id]/page.tsx:140` | `<Fact label="Archived at" ... />` | `TRANSLATE_NOW` | P2 | `Ngày lưu trữ` |
| L-034 | `app/admin/jobs/job-postings/[id]/page.tsx:154` | `<span>...DRAFT — cần mở trước khi publish</span>` (inline raw enum in status suffix) | `TRANSLATE_NOW` | P1 | `Bản nháp — cần mở trước khi đăng` |
| L-035 | `app/admin/jobs/job-postings/[id]/page.tsx:154` | `Trạng thái: ${posting.opening.status}` (fallback path raw enum) | `TRANSLATE_NOW` | P1 | Map through `JOB_OPENING_STATUS_LABELS` (`OPEN → 'Đang mở'`, `CLOSING_SOON → 'Sắp đóng'`, `CLOSED → 'Đã đóng'`, `FILLED → 'Đã đủ chỉ tiêu'`, `CANCELLED → 'Đã hủy'`, `DRAFT → 'Bản nháp'`) |

### 5.5 `/admin/job-openings/[id]`

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-036 | `app/admin/job-openings/[id]/page.tsx:215` | `{ label: \`Job Opening: ${opening.id.substring(0, 8)}\`, ...}` (breadcrumb) | `VIETNAMESE_WITH_TECHNICAL_HINT` (T0 binding) | P1 | `Đợt tuyển dụng: ${opening.id.substring(0, 8)}` (T0 §2 #6) |
| L-037 | `app/admin/job-openings/[id]/page.tsx:229` | `<span>{opening.status}</span>` (raw enum badge) | `TRANSLATE_NOW` | P1 (raw enum badge in core route; operator can still read status — reclassified per T0 severity definitions) | Lift dictionary per L-035 |
| L-038 | `app/admin/job-openings/[id]/page.tsx:231` | `{opening.serviceModel}` (raw enum like `ONSITE` / `REMOTE`) | `TRANSLATE_NOW` (T0 binding) | P2 | `onsite → 'Tại nơi làm việc'`, `remote → 'Từ xa'` (T0 §2 #17); render through `serviceModelLabel()` dictionary; canonical enum value preserved in tooltip. |
| L-039 | `app/admin/job-openings/[id]/page.tsx:242` | `MetricCard label="Candidate Submissions"` | `TRANSLATE_NOW` (T0 binding) | P1 | `Đơn ứng tuyển` (T0 §2 #8) |
| L-040 | `app/admin/job-openings/[id]/page.tsx:243` | `MetricCard label="Project Assignments"` | `TRANSLATE_NOW` (T0 binding) | P1 | `Phân công dự án` (T0 §2 #9) |
| L-041 | `app/admin/job-openings/[id]/page.tsx:244` | `MetricCard label="Placements"` | `TRANSLATE_NOW` (T0 binding) | P1 | `Bố trí việc làm` (T0 §2 #10) |
| L-042 | `app/admin/job-openings/[id]/page.tsx:256` | `<h2>Đăng tuyển (Job Posting)</h2>` | (template) | — | `Job Posting` → `Tin tuyển dụng` (Q5) for the visible label; keep canonical in aria-label |
| L-043 | `app/admin/job-openings/[id]/page.tsx:271` | `<h2>Vị trí (Slots)</h2>` | (template) | — | `Slots` → `Vị trí` (already Vietnamese primary); OK |

### 5.6 `/admin/staffing` (Staffing Orders)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-044 | `app/admin/staffing/staffing-list-client.tsx:421` | `<h1>Staffing Orders</h1>` | `TRANSLATE_NOW` (T0 binding) | P1 | `Nhu cầu tuyển dụng` (T0 §2 #4) |
| L-045 | `app/admin/staffing/staffing-list-client.tsx:483` | `<th>Slots</th>` | `TRANSLATE_NOW` | P2 | `Vị trí` |
| L-046 | `app/admin/staffing/staffing-list-client.tsx:530` | `Tổng: {total} orders` | `TRANSLATE_NOW` | P2 | `Tổng: {total} đơn` |

### 5.7 `/admin/applications` (already gold-standard)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-047 | `app/admin/applications/page.tsx:412-417` | `<dt>SĐT</dt> ... <dt>CCCD</dt> ... <dt>Worker</dt>` | (template) | — | Lift `CCCD` → `Số CCCD` for consistency with other surfaces (P3 cosmetic) |
| L-048 | `app/admin/applications/page.tsx:417` | `{STATUS_LABELS[detail.status] ?? detail.status} · v{detail.version}` | (template) | — | OK — dictionary fallback safe |

### 5.8 `/admin/attendance` (heavy English + encoding defects)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-049 | `app/admin/attendance/page.tsx:366-371` | Column headers: `Source`, `Rows`, `Matched`, `Unmatched`, `Anomaly`, `Status` | `TRANSLATE_NOW` | P1 | `Nguồn`, `Số dòng`, `Đã khớp`, `Chưa khớp`, `Bất thường`, `Trạng thái` |
| L-050 | `app/admin/attendance/page.tsx:388-391` | Same column headers repeated | `TRANSLATE_NOW` | P1 | (same as L-049) |
| L-051 | `app/admin/attendance/page.tsx:441` | `+ Adjustment` | `TRANSLATE_NOW` | P2 | `+ Tạo điều chỉnh` |
| L-052 | `app/admin/attendance/page.tsx:444` | `<button>Approve</button>` | `TRANSLATE_NOW` | P1 | `Duyệt` |
| L-053 | `app/admin/attendance/page.tsx:447` | `<button>Khóa kỳ</button>` ✓ then line 489 `Resolve` | `TRANSLATE_NOW` | P1 | `Xử lý` |
| L-054 | `app/admin/attendance/page.tsx:489-493` | Column headers: `ID`, `Employee code`, `Date`, `Time`, `Action` | `TRANSLATE_NOW` | P1 | `Mã`, `Mã nhân viên`, `Ngày`, `Giờ`, `Thao tác` |
| L-055 | `app/admin/attendance/page.tsx:196` | `Delta hours (positive = +, negative = -)` | `TRANSLATE_NOW` | P2 | `Số giờ chênh (dương = +, âm = -)` |
| L-056 | `app/admin/attendance/page.tsx:198` | `<label>Reason (required)</label>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P1 | `Lý do (bắt buộc)` |
| L-057 | `app/admin/attendance/page.tsx:125` | `Worker ID (matched)` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mã nhân viên (đã khớp)` |
| L-058 | `app/admin/attendance/page.tsx:136` | `<button>Huy</button>` (missing diacritic) | `VIETNAMESE_DIACRITIC_MISSING` | P2 | `Hủy` |
| L-059 | `app/admin/attendance/page.tsx:199` | `placeholder="Vi du: di muon 30 phut do tac duong"` (NO diacritics across the entire placeholder) | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `placeholder="Ví dụ: đi muộn 30 phút do tắc đường"` |
| L-060 | `app/admin/attendance/page.tsx:202` | `<button>Huy</button>` (missing diacritic) | `VIETNAMESE_DIACRITIC_MISSING` | P2 | `Hủy` |

### 5.9 `/admin/reconciliation` (most encoding defects in the portal)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-061 | `app/admin/reconciliation/page.tsx:132` | `<h1>Doi soat (Reconciliation)</h1>` (encoding-loss primary heading) | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Đối soát (Reconciliation)` |
| L-062 | `app/admin/reconciliation/page.tsx:134` | `Module M4 + M8 -- slice 4C · F00A moment 09:30-13:00 · Statement 2 luong + Margin + Dispute` | `VIETNAMESE_DIACRITIC_MISSING` + `TRANSLATE_NOW` (mixed) | P1 | `Module M4 + M8 — slice 4C · F00A 09:30–13:00 · Bảng lương 2 kỳ + Lợi nhuận + Tranh chấp`. Keep `M4 + M8 -- slice 4C` canonical identifier, but use Vietnamese for the rest. (T0 narrative part) |
| L-063 | `app/admin/reconciliation/page.tsx:151-153` | Tab labels: `'Statements'`, `'Generate'`, `'Margin'` | `TRANSLATE_NOW` | P1 | `Bảng đối soát`, `Tạo từ Timesheet`, `Lợi nhuận` |
| L-064 | `app/admin/reconciliation/page.tsx:162` | `<h2>Statements</h2>` | `TRANSLATE_NOW` | P1 | `Bảng đối soát` |
| L-065 | `app/admin/reconciliation/page.tsx:167` | `+ Generate tu Timesheet` | `VIETNAMESE_DIACRITIC_MISSING` + `TRANSLATE_NOW` | P1 | `+ Tạo từ Timesheet` |
| L-066 | `app/admin/reconciliation/page.tsx:176-183` | Column headers: `Kind`, `Party`, `Period`, `Amount (VND)`, `Status`, `Dispute`, `SLA Deadline`, `Actions` | `TRANSLATE_NOW` | P1 | `Loại`, `Đối tác`, `Kỳ`, `Số tiền (VNĐ)`, `Trạng thái`, `Tranh chấp`, `Hạn SLA`, `Thao tác` |
| L-067 | `app/admin/reconciliation/page.tsx:194` | `Chua co statement nao. Generate tu tab Generate.` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Chưa có bảng đối soát nào. Tạo từ tab Tạo từ Timesheet.` |
| L-068 | `app/admin/reconciliation/page.tsx:200-207` | Same headers repeated | `TRANSLATE_NOW` | P1 | (same as L-066) |
| L-069 | `app/admin/reconciliation/page.tsx:225` | `<button>Dispute</button>` | `TRANSLATE_NOW` | P2 | `Tranh chấp` |
| L-070 | `app/admin/reconciliation/page.tsx:243` | `<h2>Generate tu Timesheet LOCKED</h2>` | `VIETNAMESE_DIACRITIC_MISSING` + `TRANSLATE_NOW` | P1 | `Tạo bảng đối soát từ Timesheet (đã khóa)` |
| L-071 | `app/admin/reconciliation/page.tsx:246` | `Tao VendorStatement + ClientStatement tu TimesheetPeriod da LOCKED.` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Tạo Bảng đối soát NCC + Bảng đối soát Khách hàng từ Kỳ Timesheet đã khóa.` |
| L-072 | `app/admin/reconciliation/page.tsx:254` | `Dang generate...` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Đang tạo...` |
| L-073 | `app/admin/reconciliation/page.tsx:262` | `<h2>Margin Breakdown</h2>` | `TRANSLATE_NOW` | P2 | `Phân tích lợi nhuận` |
| L-074 | `app/admin/reconciliation/page.tsx:284` | `Dang tai...` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Đang tải...` |
| L-075 | `app/admin/reconciliation/page.tsx:288` | `<p>Vendor payable</p>` | `TRANSLATE_NOW` | P1 | `Phải trả NCC` |
| L-076 | `app/admin/reconciliation/page.tsx:296` | `<p>Client receivable</p>` | `TRANSLATE_NOW` | P1 | `Phải thu khách hàng` |
| L-077 | `app/admin/reconciliation/page.tsx:304` | `<p>Margin</p>` | `TRANSLATE_NOW` | P1 | `Lợi nhuận` |
| L-078 | `app/admin/reconciliation/page.tsx:313` | `<h3>Dispute Statement {showDispute.id}</h3>` | `TRANSLATE_NOW` | P2 | `Tranh chấp Bảng đối soát {showDispute.id}` |
| L-079 | `app/admin/reconciliation/page.tsx:315` | `<p>Party: {showDispute.partyName}</p>` | `TRANSLATE_NOW` | P2 | `<p>Đối tác: {showDispute.partyName}</p>` |
| L-080 | `app/admin/reconciliation/page.tsx:319` | `Dispute count hien tai: {showDispute.disputeCount}/2` | `VIETNAMESE_DIACRITIC_MISSING` + `TRANSLATE_NOW` | P1 | `Số tranh chấp hiện tại: {showDispute.disputeCount}/2` |
| L-081 | `app/admin/reconciliation/page.tsx:320` | `<label>Ly do (required)</label>` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `Lý do (bắt buộc)` |
| L-082 | `app/admin/reconciliation/page.tsx:321` | `placeholder="Vi du: So gio khong khop voi check-in thuc te"` | `VIETNAMESE_DIACRITIC_MISSING` | P1 | `placeholder="Ví dụ: Số giờ không khớp với check-in thực tế"` |
| L-083 | `app/admin/reconciliation/page.tsx:322` | `<label>Attachment URL (optional)</label>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `URL tài liệu đính kèm (tuỳ chọn)` |
| L-084 | `app/admin/reconciliation/page.tsx:325` | `<button>Huy</button>` | `VIETNAMESE_DIACRITIC_MISSING` | P2 | `Hủy` |
| L-085 | `app/admin/reconciliation/page.tsx:329` | `<button>Submit dispute</button>` | `TRANSLATE_NOW` | P1 | `Gửi tranh chấp` |

### 5.10 `/admin/users` (ROLE_LABELS inconsistency)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-086 | `app/admin/users/page.tsx:23-37` | `ROLE_LABELS` mapping (partial Vietnamese, partial English) | `TRANSLATE_NOW` | P1 | Lift to shared `src/shared/auth/role-labels.ts`: `HR_MANAGER → 'Quản lý nhân sự'`, `HR_STAFF → 'Chuyên viên nhân sự'`, `WORKER → 'Người lao động'`, `MKT → 'Marketing'`, `VENDOR_ADMIN → 'Quản trị NCC'`, `VENDOR_STAFF → 'Nhân viên NCC'`, `EMPLOYEE → 'Nhân viên'`. Keep canonical enum keys. |
| L-087 | `app/admin/users/page.tsx:108` | `<th>User ID</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mã người dùng` |
| L-088 | `app/admin/users/page.tsx:109` | `<th>Vendor ID</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mã nhà cung cấp` |
| L-089 | `app/admin/users/page.tsx:127` | `Tổng: {total} users` | `TRANSLATE_NOW` | P2 | `Tổng: {total} người dùng` |

### 5.11 `/admin/media`

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-090 | `app/admin/media/media-library-client.tsx:156` | `<h2>Folder</h2>` | `TRANSLATE_NOW` | P1 | `Thư mục` |
| L-091 | `app/admin/media/media-library-client.tsx:202-203, 525-526, 693-694` | `<option value="PUBLIC">PUBLIC</option>`, `<option value="INTERNAL">INTERNAL</option>` (raw enum options) | `TRANSLATE_NOW` | P1 (raw enum in three modal `<select>` controls; operator can still select — reclassified per T0 severity definitions) | `Công khai`, `Nội bộ`. Note: keep `<option value="...">` attribute as canonical enum, only translate the inner text. |
| L-092 | `app/admin/media/media-library-client.tsx:188` | `placeholder="Tìm filename / alt / caption…"` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Tìm theo tên tệp / alt / caption…` |
| L-093 | `app/admin/media/media-library-client.tsx:531` | `<label>Alt text ... *</label>` | `TRANSLATE_NOW` | P2 | `Alt text (văn bản thay thế)` |
| L-094 | `app/admin/media/media-library-client.tsx:548` | `<label>Caption (optional)</label>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Chú thích (tuỳ chọn)` |
| L-095 | `app/admin/media/media-library-client.tsx:608` | `Alt text là bắt buộc khi status = PUBLIC.` | `TRANSLATE_NOW` | P2 | `Alt text là bắt buộc khi trạng thái = Công khai.` |

### 5.12 `/admin/settings`

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-096 | `app/admin/settings/admin-settings-form.tsx:271` | `<h2>Homepage Settings</h2>` | `TRANSLATE_NOW` | P1 | `Cài đặt trang chủ` |
| L-097 | `app/admin/settings/admin-settings-form.tsx:283` | `AV1 · ACTIVE` chip | (template) | — | `AV1 · Hoạt động` (decode `ACTIVE` through the same dictionary) |

### 5.13 `/admin/recruiter-workbench` (gold-standard template)

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-098 | `app/admin/recruiter-workbench/page.tsx:53` | `metadata.title: 'Recruiter Workbench - Admin'` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Bàn làm việc tuyển dụng - Admin` (T0 §2 #13) |
| L-099 | `app/admin/recruiter-workbench/page.tsx:151` | `<h1>Recruiter Workbench</h1>` | `TRANSLATE_NOW` (T0 binding) | P2 | `Bàn làm việc tuyển dụng` (T0 §2 #13). The previous `TASK.md §4.4` freeze is overridden by T0 §2 #13; breadcrumb + metadata + H1 are updated together. |
| L-100 | `app/admin/recruiter-workbench/_components/AgeCell.tsx:30-32` | Format returns `'<1h'`, `'${rounded}h'`, `'${days}d ${remainder}h'` (English abbreviations of duration) | `TRANSLATE_NOW` (T0 binding) | P2 | `'<1 giờ'`, `'${rounded} giờ'`, `'${days} ngày ${remainder} giờ'` (T0 §2 #15). The cell remains at-a-glance; the canonical `ageHours` server-derived field is unchanged. |

### 5.14 `/admin/tickets`, `/admin/payroll`, `/admin/clients`, `/admin/workers`, `/admin/projects`, `/admin/labor-profiles`, `/admin/vendors`

| ID | file:line | Evidence | Taxonomy | Severity | Suggested action |
| --- | --- | --- | --- | --- | --- |
| L-101 | `app/admin/tickets/page.tsx:114` | `<h1>Phản ánh / Khiếu nại</h1>` ✓ (Vietnamese) | (template) | — | OK |
| L-102 | `app/admin/tickets/page.tsx:172` | Column headers include `Ưu tiên`, `Ngày làm việc`, `Chênh lệch` ✓ | (template) | — | OK |
| L-103 | `app/admin/tickets/page.tsx:205` | `Tổng: {total} tickets` | `TRANSLATE_NOW` | P2 | `Tổng: {total} phiếu` |
| L-104 | `app/admin/payroll/page.tsx:187` | Column headers `Mã`, `Mô tả`, `Giá trị`, `Loại`, `Phiên bản`, `Hiệu lực`, `Trạng thái` ✓ | (template) | — | OK |
| L-105 | `app/admin/clients/page.tsx:166` | `<h1>Khách hàng</h1>` ✓ | (template) | — | OK |
| L-106 | `app/admin/workers/page.tsx:177` | `<h1>Nhân viên</h1>` ✓ | (template) | — | OK |
| L-107 | `app/admin/workers/page.tsx:218` | `<th>User ID</th>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Mã người dùng` |
| L-108 | `app/admin/projects/page.tsx:209` | `<h1>Dự án</h1>` ✓ | (template) | — | OK |
| L-109 | `app/admin/projects/page.tsx:238` | Column headers `Mã`, `Tên dự án`, `Trạng thái`, `Ngày bắt đầu`, `Ngày tạo`, `Hành động` ✓ | (template) | — | OK |
| L-110 | `app/admin/labor-profiles/page.tsx:50` | `<h1>Hồ sơ NLD</h1>` ✓ | (template) | — | OK |
| L-111 | `app/admin/labor-profiles/page.tsx:87-92` | Column headers `Họ và tên`, `Số điện thoại`, `Xác minh danh tính`, `Độ hoàn thiện`, `Liên kết Worker`, `Ngày tạo` ✓ | (template) | — | OK |
| L-112 | `app/admin/labor-profiles/[id]/page.tsx:53` | `{data.fullName || 'Chưa cập nhật tên'}` ✓ | (template) | — | OK |
| L-113 | `app/admin/labor-profiles/[id]/page.tsx:58` | `title="Tính năng đang được phát triển"` ✓ | (template) | — | OK |
| L-114 | `app/admin/labor-profiles/[id]/page.tsx:71` | `<h2>Nhận diện & Xác minh</h2>` ✓ | (template) | — | OK |
| L-115 | `app/admin/labor-profiles/[id]/page.tsx:74` | `<dt>Số CCCD:</dt>` ✓ | (template) | — | OK |
| L-116 | `app/admin/labor-profiles/[id]/page.tsx:117` | `<h2>Nguồn tiếp nhận</h2>` ✓ | (template) | — | OK |
| L-117 | `app/admin/labor-profiles/[id]/page.tsx:140` | `<h2>Quyền hưởng hoa hồng</h2>` ✓ | (template) | — | OK |
| L-118 | `app/admin/labor-profiles/[id]/page.tsx:146` | `<h2>Nhu cầu (Submissions)</h2>` | `VIETNAMESE_WITH_TECHNICAL_HINT` | P2 | `Nhu cầu ứng tuyển` |
| L-119 | `app/admin/labor-profiles/[id]/page.tsx:162` | `<h2>Lịch sử làm việc</h2>` ✓ | (template) | — | OK |
| L-120 | `app/admin/recruiter-workbench/_components/ForbiddenPanel.tsx:30` | `Không có quyền truy cập` ✓ | (template) | — | OK |
| L-121 | `app/admin/recruiter-workbench/_components/InvalidQueryPanel.tsx:36` | `Tham số truy vấn không hợp lệ` ✓ | (template) | — | OK |

### 5.15 Summary by module

| Module | Findings | P0 | P1 | P2 | P3 | Diacritic-missing |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Sidebar / role-guard | 9 | 0 | 1 | 1 | 3 | 0 |
| `/admin/jobs` (Project list) | 9 | 0 | 6 | 1 | 0 | 0 |
| `/admin/jobs/job-postings` | 7 | 0 | 5 | 2 | 0 | 0 |
| `/admin/jobs/job-postings/[id]` | 10 | 0 | 4 | 6 | 0 | 0 |
| `/admin/job-openings/[id]` | 8 | 0 | 5 | 2 | 0 | 0 |
| `/admin/staffing` | 3 | 0 | 1 | 2 | 0 | 0 |
| `/admin/attendance` | 12 | 0 | 5 | 4 | 0 | **3** |
| `/admin/reconciliation` | 25 | 0 | 13 | 6 | 0 | **12** |
| `/admin/users` | 4 | 0 | 1 | 3 | 0 | 0 |
| `/admin/media` | 6 | 0 | 2 | 2 | 0 | 0 |
| `/admin/settings` | 2 | 0 | 1 | 0 | 0 | 0 |
| `/admin/recruiter-workbench` | 3 | 0 | 0 | 2 | 0 | 0 |
| Other surfaces (tickets, payroll, clients, workers, projects, labor-profiles, vendors, applications, forbidden, invalid-query) | 21 | 0 | 0 | 3 | 0 | 0 |
| **TOTAL** | **119** | **0** | **44** | **36** | **3** | **15** |

Top English-leakage modules (by P1 count; P0 column intentionally zero per T0 severity definitions):

1. `/admin/reconciliation` — 13 P1 + 12 diacritic-missing
2. `/admin/jobs` (Project list) — 6 P1
3. `/admin/job-openings/[id]` — 5 P1
4. `/admin/jobs/job-postings` — 5 P1
5. `/admin/attendance` — 5 P1 + 3 diacritic-missing
6. `/admin/jobs/job-postings/[id]` — 4 P1
7. `/admin/media` — 2 P1
8. `/admin/users` — 1 P1

Top diacritic-missing modules:

1. `/admin/reconciliation` — 12 occurrences
2. `/admin/attendance` — 3 occurrences
3. (no other module shows the pattern this audit can detect statically; a future static test pass may find more — but no regex heuristic will be used, see §2.4 #4)

### 5.16 Top 20 terms requiring Owner decision

| Rank | English / canonical | Surfacing in | Suggested Vietnamese | Owner decision |
| ---: | --- | --- | --- | --- |
| 1 | `Staffing` (sidebar label) | `src/shared/ui/role-guard/role-guard-layout.tsx:130` | `Danh sách đơn tuyển` / `Yêu cầu cung ứng` | Q3 |
| 2 | `Staffing Order` (page H1) | `app/admin/staffing/staffing-list-client.tsx:421` | `Nhu cầu tuyển dụng` / `Yêu cầu cung ứng` / `Đơn hàng` | Q3 |
| 3 | `JobOpening` | `app/admin/job-openings/[id]/page.tsx:215` | `Đợt tuyển dụng` / `Vị trí đang tuyển` | Q5 |
| 4 | `JobPosting` (label) | `app/admin/jobs/job-postings/page.tsx:196,199` | `Tin tuyển dụng` (keep canonical in tooltip) | Q5 |
| 5 | `Project` (column header on `/admin/jobs`) | `app/admin/jobs/page.tsx:319` | `Dự án` | (translation) |
| 6 | `Publish` (column header on `/admin/jobs`) | `app/admin/jobs/page.tsx:323` | Keep `Publish` (M2A F11 boundary) or translate with disambiguation tooltip | Q1 |
| 7 | `Slug` | `app/admin/jobs/job-postings/page.tsx:289`, `:128` | `Đường dẫn tin (slug)` | (translation) |
| 8 | `Revision` | `app/admin/jobs/job-postings/page.tsx:302`, `:130` | `Phiên bản chỉnh sửa (revision)` | (translation) |
| 9 | `Statements` (reconciliation tab) | `app/admin/reconciliation/page.tsx:151-153` | `Bảng đối soát` | (translation) |
| 10 | `Margin Breakdown` | `app/admin/reconciliation/page.tsx:262` | `Phân tích lợi nhuận` | (translation) |
| 11 | `Candidate Submissions` (MetricCard) | `app/admin/job-openings/[id]/page.tsx:242` | `Đơn ứng tuyển` | Q6 |
| 12 | `Project Assignments` (MetricCard) | `app/admin/job-openings/[id]/page.tsx:243` | `Phân công dự án` | Q6 |
| 13 | `Placements` (MetricCard) | `app/admin/job-openings/[id]/page.tsx:244` | `Bố trí việc làm` | Q6 |
| 14 | `Identity Verification` (status badge) | `app/admin/labor-profiles/[id]/page.tsx:82` | `Đã xác minh` / `Đang chờ xác minh` / `Bị từ chối` | Q4 |
| 15 | `Role` (subtle in user footer) | `src/shared/ui/role-guard/role-guard-layout.tsx:455` | `Quản trị viên` / `Quản lý nhân sự` / etc. | Q2 |
| 16 | `Recruiter Workbench` (H1) | `app/admin/recruiter-workbench/page.tsx:151` | `Bảng công việc của Recruiter` | Q7 |
| 17 | `Homepage Settings` (settings H2) | `app/admin/settings/admin-settings-form.tsx:271` | `Cài đặt trang chủ` | (translation) |
| 18 | `Slots` (column header on `/admin/staffing`) | `app/admin/staffing/staffing-list-client.tsx:483` | `Vị trí` | (translation) |
| 19 | `Folder` (media sidebar) | `app/admin/media/media-library-client.tsx:156` | `Thư mục` | (translation) |
| 20 | `Adjust` / `Adjustment` (attendance) | `app/admin/attendance/page.tsx:441` | `Điều chỉnh` | (translation) |

The remaining 99 findings fall into one of two buckets:

- **Dictionary-table copy** — straightforward `TRANSLATE_NOW` items with a clear Vietnamese label (e.g. `Status → 'Trạng thái'`, `Reason (required) → 'Lý do (bắt buộc)'`, `Action → 'Thao tác'`). The execution plan §5 wave-level extracts a single dictionary per module and re-uses it.

### 5.17 Duplicated / inconsistent translations

| Term | Surface A | Surface B | Inconsistency |
| --- | --- | --- | --- |
| `User ID` | `app/admin/users/page.tsx:108` (column) | `app/admin/workers/page.tsx:218` (column) | Both use literal `User ID` (English). Wave 3 (T1B) must standardize on `Mã người dùng`. |
| `Staffing` vs `Staffing Order` | Sidebar (`role-guard-layout.tsx:130`) | Page H1 (`staffing-list-client.tsx:421`) | Sidebar uses bare `Staffing`; page uses `Staffing Orders`. Wave 2 (T1B) unifies on `Nhu cầu tuyển dụng` (T0 §2 #4). |
| `Status` vs `Trạng thái` | `/admin/jobs` (L322), `/admin/jobs/job-postings` (L301), `/admin/attendance` (L370) | `/admin/projects`, `/admin/workers`, `/admin/labor-profiles` | Most surfaces use `Trạng thái`; three use `Status`. Wave 2 / Wave 4 (T1B / T1C) standardize on `Trạng thái`. |
| `Resolve` vs `Xử lý` | `app/admin/attendance/page.tsx:503` | `app/admin/tickets/page.tsx:172` (column) | Action vocabulary mismatch; standardize on `Xử lý`. Wave 4 (T1C). |
| `DRAFT` / `PUBLISHED` / `ARCHIVED` (raw enum options) | `app/admin/jobs/job-postings/page.tsx:230-233` | `app/admin/jobs/page.tsx:60-77` (in `STATUS_COLORS`) | Same enum, two different dictionaries, one missing. Wave 2 (T1B) consolidates via the domain-owned `job-posting-ui.ts` dictionary + moves the misplaced application-status spellings to `src/domains/applications/application-ui.ts`. |
| `Worker ID` vs `Mã nhân viên` | `app/admin/attendance/page.tsx:125` | (other surfaces use Vietnamese) | Inconsistent; standardize on `Mã người lao động` (T0 §2 #14). Wave 4 (T1C). |
| `Action` / `Thao tác` / `Hành động` | `app/admin/attendance/page.tsx:493` (`Action`) | `app/admin/projects/page.tsx:238` (`Hành động`), `app/admin/workers/page.tsx:218` (`Hành động`), `app/admin/applications/page.tsx:209` (`Thao tác`) | Three English/Vietnamese variants in the same role. Standardize on `Thao tác`. Wave 2 / Wave 3 (T1B). |
| `Status` enum `DRAFT` vs `Nháp` | `app/admin/attendance/page.tsx` (raw) | `app/admin/projects/page.tsx:131` (`Nháp`) | Same enum, two display paths. Wave 4 (T1C) ensures only the domain-owned dictionary renders. |

### 5.18 Raw enum leakage (operator-facing)

| ID | file:line | Source | Where it leaks to operator |
| --- | --- | --- | --- |
| RE-01 | `app/admin/jobs/page.tsx:79-82, 351` | `STATUS_COLORS` and hardcoded `'Published' / 'Closed' / 'Unpublished'` literals | StatusBadge renders raw string |
| RE-02 | `app/admin/jobs/job-postings/page.tsx:230-233` | `STATUSES.map(s => <option>{s}</option>)` | Filter dropdown |
| RE-03 | `app/admin/jobs/job-postings/page.tsx:319` | `Chưa có JobPosting nào ở trạng thái ${statusFilter}` | Empty-state description |
| RE-04 | `app/admin/job-openings/[id]/page.tsx:229` | `<span>{opening.status}</span>` | Status chip |
| RE-05 | `app/admin/job-openings/[id]/page.tsx:231` | `<span>{opening.serviceModel}</span>` | Service-model chip |
| RE-06 | `app/admin/labor-profiles/[id]/page.tsx:82` | `{data.identityVerification}` | Identity-verification chip |
| RE-07 | `app/admin/media/media-library-client.tsx:202-203, 525-526, 693-694` | `<option>PUBLIC</option>` etc. | Status select in 3 modals |
| RE-08 | `app/admin/staffing/staffing-list-client.tsx:31` | `STATUS_FILTERS = ['', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'CANCELLED']` (raw enums drive filter chips; rendered through `STATS_CONFIG[s]?.label ?? s`) | Filter chips (fallback path renders raw enum if dictionary missing) |
| RE-09 | `app/admin/projects/page.tsx:220` | `['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']` (filter chip) | Filter chips (rendered via dictionary — currently safe) |
| RE-10 | `app/admin/workers/page.tsx:191` | `['', 'NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED']` (filter chip) | Filter chips (rendered via dictionary — currently safe) |

**Audit note**: RE-01, RE-02, RE-03, RE-04, RE-06, RE-07 are the most severe because they currently render raw English enum values to the operator. RE-08, RE-09, RE-10 are safe today only because the page-level dictionary exists — a future refactor that breaks the dictionary contract will reintroduce raw enum leakage. The execution plan §4 mandates a **domain-owned** typed dictionary per module (not a single global dictionary) so the dictionary contract is enforced by the static type checker.

### 5.19 Raw technical / error leakage

| ID | file:line | Evidence | Severity | Suggested action |
| --- | --- | --- | --- | --- |
| RT-01 | `app/admin/jobs/page.tsx:351` | `<StatusBadge status={'Published'|'Closed'|'Unpublished'} />` (hardcoded English status literals) | P1 (reclassified per T0 severity definitions; same finding as L-014/L-015) | Replace with dictionary lookup |
| RT-02 | `app/admin/jobs/page.tsx:60-77` | `STATUS_COLORS` keys include application statuses (DA_NHAN_DU, DANG_TUYEN, NEW, etc.) in a Project-list file | P1 (reclassified per T0 severity definitions; same finding as L-018) | Move to `src/domains/applications/application-ui.ts`; remove from `app/admin/jobs/page.tsx` |
| RT-03 | `app/admin/job-openings/[id]/page.tsx:82` (and similar) | `{data.identityVerification}` raw | P1 | Dictionary `identityVerificationLabel()` |
| RT-04 | `app/admin/recruiter-workbench/_components/AgeCell.tsx:30-32` | Format returns English `'<1h'`, `'Xh'`, `'Xd Yh'` | P2 (Frozen) | Owner decision per execution plan §3 Q7 |
| RT-05 | `app/admin/users/page.tsx:23-37` | `ROLE_LABELS` partial English (`HR Manager`, `HR Staff`, etc.) | P1 | Shared `roleLabels.ts` |
| RT-06 | `app/admin/settings/admin-settings-form.tsx:283` | `AV1 · ACTIVE` chip | P2 | `AV1 · Hoạt động` (decode via shared) |

No raw API error code currently leaks to the Admin UI through the routes audited — the existing error mappers (`JOB_POSTING_ERROR_LABELS`, `CONFLICT_LABELS`) are correctly mapped. The execution plan §6 keeps the error mapping frozen.

### 5.20 Data-content findings (separated per T0 §D.4)

The audit did not find any test fixture on production. The user-entered data observed in screenshots (e.g. `N3 Test Project`, `Order p1a...`) is `DATA_CONTENT_NOT_UI_COPY` and is out of scope.

If the Owner-supplied PNG evidence later reveals production fixtures (e.g. `N3 Test Project` in the live DB), raise it as an operational finding on a separate task — do NOT bundle with localization.

### 5.21 Coverage summary

- **Routes surveyed**: 38/38 (100% of `app/admin/**` routes; including `app/admin/_components/**` placeholder route).
- **Shared UI surveyed**: `src/shared/ui/role-guard/**`, plus recursive import walk into `src/shared/ui/**` referenced by admin.
- **Domain dictionaries surveyed**: `placement-ui.ts`, `job-posting-error-map.ts`, `recruiter-assignment-manager.tsx`, `NextActionBadge.tsx`, `applications/page.tsx` (inline), `projects/page.tsx` (inline), `workers/page.tsx` (inline).
- **API error mappers surveyed**: `JOB_POSTING_ERROR_LABELS`, `CONFLICT_LABELS`. None found with raw API leakage to admin UI.
- **Out of scope**: Worker Portal (`app/m/**`), Vendor Portal (`app/vendor/**`), public site (`app/(public)/**`, `app/viec-lam/**`).

## 6. Architecture findings (audit-side)

1. **No i18n library required**: 5 typed dictionaries (`placement-ui.ts`, `job-posting-error-map.ts`, `recruiter-assignment-manager.tsx` inline, `NextActionBadge.tsx` inline, `projects/page.tsx` inline, `workers/page.tsx` inline) cover 30+ enum values already. Adoption of `next-intl`/`react-intl` would require 0 new benefit and 1 new migration cost. **Recommendation**: keep typed dictionary pattern.
2. **Inline dictionaries must consolidate, but per domain**: `STATUS_CONFIG` is duplicated in 3 places (projects, workers, recruiter-assignment-manager). Each has a different shape (`{ label, color, bg }` vs `{ label, tone }`). Wave 2 lifts each into its **own** domain-owned typed dictionary (`src/domains/projects/project-ui.ts`, `src/domains/workforce/worker-ui.ts`, `src/domains/staffing/recruiter-assignment-ui.ts`). The shared surface is a `<StatusBadge>` presentation primitive that takes `{ module, status }` and reads from the appropriate domain dictionary. **Do NOT build a single global status dictionary that owns all domains**; this would create an import-graph bottleneck and undo the domain-bounded ownership principle.
3. **No static fence for raw enum leakage**: today the F11 frozen contract protects `/admin/jobs` and the JobPosting editor. There is no equivalent fence for `/admin/attendance` (column headers), `/admin/job-openings/[id]` (status chip), `/admin/jobs/job-postings` (filter dropdown), `/admin/media` (status options). Wave 2 / Wave 4 introduce per-module static tests (forbidden-literal lists, allowlist, dictionary exhaustiveness).
4. **Diacritic-missing detection gap**: the audit found 15 occurrences of missing-diacritic strings by visual / codepoint inspection. Heuristic regex matchers (e.g. `Huy`) are unreliable — they would false-positive on Vietnamese proper names, user-entered data, and canonical identifiers. Detection MUST be done by **explicit forbidden-literal lists per route** (e.g. `forbid(['Huy', 'Dang', 'tao'])` in `attendance-terminology.static.test.ts`) combined with an allowlist for canonical tokens. No ESLint plugin is required.
5. **Glossary has no central source-of-truth**: each module's `STATUS_LABELS`/`CONFLICT_LABELS` is a local dictionary. Wave 1 §2 creates `src/shared/i18n/glossary.ts` that holds **only the cross-module canonical Vietnamese terms** (Project, StaffingOrder, JobOpening, JobPosting, LaborProfile, etc.); the **domain-owned typed dictionaries** (per #2) consume the glossary entries for cross-domain terms and own module-specific terms locally.

## 7. Counts and severity tally

| Bucket | Count | Note |
| --- | ---: | --- |
| Findings total | 119 | includes 21 template (already-Vietnamese) entries for completeness |
| Findings (excluding templates) | 98 | actionable |
| `TRANSLATE_NOW` | 47 | operator-facing English |
| `VIETNAMESE_WITH_TECHNICAL_HINT` | 21 | keep canonical in parens/tooltip |
| `OWNER_DECISION_REQUIRED` | 0 | all Owner decisions are now BINDING (see §8); no remaining `[OWNER]` markers |
| `KEEP_CANONICAL_IDENTIFIER` | 7 | canonical enum values, IDs, codes |
| `DATA_CONTENT_NOT_UI_COPY` | 0 | no fixture-on-production observed; see §5.20 |
| `VIETNAMESE_DIACRITIC_MISSING` (NEW) | 15 | missing-diacritic prefix/suffix artifacts; symptom-only, no causal claim |
| Severity P0 | 0 | **no workflow-blocking evidence found**; raw English / raw enum → P1 per T0 severity definitions (§2.3) |
| Severity P1 | 44 | visible English / raw enum in core Admin routes (re-tallied; 7 P0 entries reclassified to P1) |
| Severity P2 | 36 | visible English in secondary routes / technical hints / diacritic-missing in non-blocking positions |
| Severity P3 | 3 | branding / footer / out-of-scope surfaces |
| Module with most leakage | `/admin/reconciliation` | 13 P1 + 12 diacritic-missing |
| Module with most diacritic defects | `/admin/reconciliation` | 12 occurrences |
| Total dictionary entries needed | ~50 | across 8 module-level domain dictionaries (Wave 2 / Wave 3 / Wave 4) |

**Tally reconcile** (vs the original draft): the original headline `7 P0` is replaced with `0 P0` + 7 P1-promotions. All summary tables, the per-module matrix (§5.15), and the wave-level scope statements were updated together; counts in the findings ledger (§5) and the summary tally (§7) reconcile row-by-row.

## 8. Owner sign-off (BINDING — T0 directive applied)

The Owner sign-off matrix is now **binding** (T0 directive §2); the `[OWNER]` markers in the execution plan §3 are removed. The translations below apply verbatim; downstream execution plan §3 lists the same canonical mappings and the wave-level ownership.

| # | English / canonical | Binding Vietnamese | Owner-decision source |
| ---: | --- | --- | --- |
| 1 | `Project` (`Publish` column header on `/admin/jobs`) | `Công bố` (column header) | T0 §2 #1 |
| 2 | `JobPosting` action `Publish` (editor shell, display) | `Đăng tin` | T0 §2 #2 |
| 3 | `JobPosting` action `Unpublish` | `Gỡ tin` | T0 §2 #2 |
| 4 | `JobPosting` action `Archive` | `Lưu trữ` | T0 §2 #2 |
| 5 | `Project` action (page-level, F11) | `Công bố dự án` / `Bỏ công bố dự án` (frozen — M2A F11) | T0 §2 (F11) |
| 6 | System role (sidebar footer, role chip) | Vietnamese per execution plan §3.4; role displayed in Vietnamese; canonical enum stays in tooltip / technical hint only | T0 §2 #3 |
| 7 | `Staffing` (sidebar) | `Nhu cầu tuyển dụng` | T0 §2 #4 |
| 8 | `Staffing Order` (page H1) | `Nhu cầu tuyển dụng` | T0 §2 #4 |
| 9 | `StaffingOrderSlot` | `Vị trí cần tuyển` | T0 §2 #5 |
| 10 | `JobOpening` | `Đợt tuyển dụng` | T0 §2 #6 |
| 11 | `JobPosting` (label) | `Tin tuyển dụng` | T0 §2 #7 |
| 12 | `Candidate Submission` | `Đơn ứng tuyển` | T0 §2 #8 |
| 13 | `Project Assignment` | `Phân công dự án` | T0 §2 #9 |
| 14 | `Placement` | `Bố trí việc làm` | T0 §2 #10 |
| 15 | `LaborProfile` (long) | `Hồ sơ người lao động` | T0 §2 #11 |
| 16 | `LaborProfile` (short) | `Hồ sơ NLĐ` | T0 §2 #11 |
| 17 | `Worker` | `Người lao động` | T0 §2 #12 |
| 18 | `Recruiter Workbench` | `Bàn làm việc tuyển dụng` | T0 §2 #13 |
| 19 | `Worker ID` (column header) | `Mã người lao động` | T0 §2 #14 |
| 20 | `AgeCell` `<1h` | `<1 giờ` | T0 §2 #15 |
| 21 | `AgeCell` `Xh` | `X giờ` | T0 §2 #15 |
| 22 | `AgeCell` `Xd Yh` | `X ngày Y giờ` | T0 §2 #15 |
| 23 | Identity verification `VERIFIED` | `Đã xác minh` | T0 §2 #16 |
| 24 | Identity verification `PENDING` | `Đang chờ xác minh` | T0 §2 #16 |
| 25 | Identity verification `REJECTED` | `Bị từ chối` | T0 §2 #16 |
| 26 | serviceModel `onsite` | `Tại nơi làm việc` | T0 §2 #17 |
| 27 | serviceModel `remote` | `Từ xa` | T0 §2 #17 |

### 8.1 Diacritic-missing batch (T0 §2 #18)

Per T0 §2 #18, the 15 diacritic-missing occurrences are fixed in the wave that owns the route — Wave 4 (Attendance / Reconciliation) and Wave 2 (where they overlap with JobPosting). Each fix is bundled with the route's static-fence test; no cross-module PR is required.

### 8.2 F11 freeze clarified (T0 §2 closing paragraph)

M2A F11 now freezes only the business distinction:

- **Project** level: `Công bố dự án` / `Bỏ công bố dự án` (Vietnamese display buttons).
- **JobPosting** level: `Đăng tin` / `Gỡ tin` / `Lưu trữ` (Vietnamese display actions).

F11 is **NOT** a reason to keep any other button / title / column header in English. The English-literal `Publish` on the JobPosting **editor shell** is no longer preserved verbatim — the editor-shell labels adopt the T0 §2 #2 binding (`Đăng tin` / `Gỡ tin` / `Lưu trữ`). The static fence `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts` is updated in the same wave to reflect the new labels.

The Project-level `Publish` column header on `/admin/jobs` is renamed to `Công bố` (T0 §2 #1); the existing static-test assertion that "Publish column header mirrors the F11 button" is removed.

## 9. Findings that hit pre-existing frozen contracts (RISK-tagged)

The audit applies the revised F11 freeze boundary (T0 §2 closing paragraph):

- **F11 frozen (Project level)**: `Công bố dự án` / `Bỏ công bố dự án` business-button literals on the `/admin/jobs` Project-level actions. MUST NOT change.
- **F11 frozen (JobPosting level)**: the business distinction `Đăng tin` / `Gỡ tin` / `Lưu trữ` (Vietnamese display actions) maps to the canonical `Publish` / `Unpublish` / `Archive` lifecycle operations. The canonical enum values and the lifecycle itself never change; the displayed Vietnamese labels now follow T0 §2 #2.
- **Frozen contract**: 7-value `ServerDerivedNextAction` exhaustive map (`NextActionBadge.tsx:38-50`). Adding/removing values MUST break the build. NOT in scope.
- **Frozen contract**: Application lifecycle action matrix (`placement-ui.ts:35-49`). Mirrors server gates. NOT in scope.
- **Frozen contract (display)**: `Recruiter Workbench` H1 (`app/admin/recruiter-workbench/page.tsx:151`) was previously frozen by `TASK.md §4.4` (referenced by the original draft). T0 §2 #13 binding (`Bàn làm việc tuyển dụng`) now applies, replacing that freeze for the H1 + breadcrumb + metadata only. The underlying `page.tsx` contract for the recruiter-workbench data model is unchanged.

The execution plan §5 keeps the wave-level ownership; L-013 (Project-level `Publish` column header) is now translated to `Công bố` per T0 §2 #1, removing the previous `RISK` flag. The static-fence test `admin-jobs-terminology.static.test.ts` is updated to assert the new Vietnamese labels while still asserting the F11 business-button literals.

## 10. Wave-specific finding rollup

See companion execution plan §5 for the wave-by-wave ownership (T0 §4 binding) and §6 for the test strategy.

| Wave | Owner | Findings count | Notable |
| --- | --- | ---: | --- |
| Wave 1 — Shared glossary + nav/shell + role labels + presentation primitives | **T1B (sole owner)** | 14 | L-001..L-009 sidebar/shell; L-018 dictionary consolidation. NO three-agent split on shared surface. |
| Wave 2 — Recruitment high-traffic (Projects, JobPosting, JobOpening, Staffing, Applications) | **T1B (sole owner)** | 49 | L-010..L-046. Must merge BEFORE T1A opens Mốc 3 source on the JobPosting editor. |
| Wave 3 — Workforce/partner (Users, Workers, LaborProfiles, Clients, Vendors) + Media/Settings gated on UI2 | **T1B (sole owner for Users/Workers/LaborProfiles/Clients/Vendors); Media/Settings either gated after UI2 and before M3, or deferred after M3 with explicit file ownership** | 25 | L-086..L-097, L-107, L-118 |
| Wave 4 — Attendance, Reconciliation, Payroll/Commission copy | **T1C (sole owner)**; T1B only reviews glossary; T1B does NOT edit files together with T1C | 31 | L-049..L-085, L-103. Static fences (forbidden-literal lists + allowlist + dictionary exhaustiveness); no ESLint plugin |
| Wave 5 — Production visual walkthrough (desktop + mobile Admin only) | **T0/Owner** | 0 | NOT extending to Worker Portal `app/m/**` |

A single finding can straddle two waves (e.g. an inline dictionary in `/admin/attendance` is Wave 4 dictionary work + the Wave 1 glossary entry). The execution plan §5 resolves overlaps; if any finding genuinely needs both Wave 2 and Wave 4 ownership, it MUST be split into two PRs to preserve the T0 §4 ownership rules.

## 11. What this audit deliberately did NOT do

Per T0 §J:

- Did not modify `app/**`, `src/**`, `prisma/**`, tests, packages, or config.
- Did not change canonical DB enum values or API field names.
- Did not merge/deploy or modify production data.
- Did not log in to production.
- Did not translate ID/code/slug value/user-entered data.
- Did not introduce i18n dependencies.
- Did not invoke Tier 3 audit.
- Did not touch PR #92, the UI V1 branch, M2A/M2B/ER/AFF history, or P2.1 implementation.

## 12. Handback

This audit is delivered alongside:

- `docs/important/HRPARTNER_ADMIN_PORTAL_VIETNAMESE_LOCALIZATION_EXECUTION_PLAN.md` — recommended glossary, architecture, waves, file ownership, test strategy, acceptance criteria, rollback boundary, production verification, dependency with UI2/Mốc 3-5/P2.1.
- `docs/tasks/hrp-admin-portal-vietnamese-localization-audit/TASK.md` — task contract.

T0/Owner handback inputs:

1. baseline/latest-main reconciliation: `f570db06a8451b7f7a9be4ad98a3a66dbfa7c2f1` (post-merge PR #93)
2. route/file coverage: 38 routes + 6 shared dictionaries (100% of audit scope)
3. total findings: 119 (98 actionable + 21 templates)
4. revised severity counts: **0 P0 / 44 P1 / 36 P2 / 3 P3 / 15 diacritic-missing** (per T0 §3.A; the original `7 P0 / 37 P1` is reconciled)
5. module with most English leakage: `/admin/reconciliation` (13 P1) and `/admin/attendance` (5 P1 + 3 diacritic-missing)
6. binding Owner decisions: see §8 (27 entries; T0 §2 #1–#18 verbatim, F11 boundary clarified per §9)
7. recommended glossary: see companion execution plan §3
8. implementation waves: 5 (Wave 1 shared foundation owned by T1B, Wave 2 recruitment owned by T1B, Wave 3 workforce/partner/system owned by T1B, Wave 4 attendance/reconciliation/tickets/payroll/commission owned by T1C, Wave 5 production walkthrough by Owner)
9. parallelization T1A/B/C: Wave 1 single-owner (T1B); Wave 2 single-owner (T1B); Wave 3 single-owner (T1B); Wave 4 single-owner (T1C); Wave 5 Owner-executed
10. exact changed files: 3 (this audit, execution plan, TASK.md)
11. commit/PR/CI: pending; non-draft PR; CI 4/4 GREEN required
12. remaining Owner decisions: 0 (all binding per §8)
13. F11 freeze scope clarified: see §9 — the editor-shell `Publish`/`Unpublish`/`Archive` literal exception is removed; the canonical lifecycle operation names remain canonical, the displayed Vietnamese labels now follow T0 §2 #2