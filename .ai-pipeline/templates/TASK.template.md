# TASK — `<task-slug>`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `<task-slug>` |
| Work type | `CODE | DOCS | DESIGN | INFRA | MIXED` |
| Assurance lane | `FAST | STANDARD | CRITICAL` |
| Audit mode | `NONE | FOCUSED | DEEP` (suy ra từ lane; FAST mặc định NONE) |
| Spec version | `v1.0` |
| Status | `DRAFT | READY_FOR_EXECUTION | REVISION_REQUIRED | ACCEPTED | CANCELLED` |
| Planner | `Tier 1` |
| Baseline | `<commit SHA>` |
| In-scope roots | `<paths>` |
| Forbidden paths | `<paths hoặc None>` |
| Required gates | `<canonical commands, chỉ ghi một lần>` |
| Current execution round | `0` |
| Current audit round | `0` |
| Next gate | `<FAST: /code → /resolve; STANDARD/CRITICAL: /code → /audit → /resolve>` |

> Lane rule: schema/migration/RLS/auth/permission/PII/money/infra/production/shared toolchain luôn `CRITICAL`. Task lịch sử thiếu lane được hiểu là CRITICAL.

## 1. Outcome

### 1.1 User-visible outcome

- `<kết quả cần đạt, không mô tả cách code>`

### 1.2 Non-goals

- `<những gì cố ý không làm>`

## 2. Evidence

Chỉ liệt kê bằng chứng cần để Tier 2 ra quyết định. FAST thường 1–3 dòng; không chép lại roadmap.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `<file:line hoặc output>` | `<ý nghĩa>` |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | `<quyết định đã chốt>` | `CHOSEN` |

Không để `NEED_USER_DECISION` khi chuyển READY_FOR_EXECUTION.

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | `<yêu cầu>` |

### 4.2 Scope boundaries

- **In:** `<files/symbols/behavior>`
- **Out:** `<explicit non-goals, WIP của agent khác>`
- **Allowed task artifacts:** `docs/tasks/<task-slug>/**`

### 4.3 Domain boundaries

Chỉ mở các mục áp dụng; mục không áp dụng ghi một dòng `N/A — <reason>`.

- **Data/state:** `<rules hoặc N/A>`
- **Permission/security:** `<rules hoặc N/A>`
- **Interface/API:** `<rules hoặc N/A>`
- **Migration/rollback:** `<rules hoặc N/A>`

## 5. Execution Plan

FAST nên có 1–4 STEP. STEP mô tả outcome theo thứ tự, không ép Tier 2 ghi nhật ký thao tác.

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `<path/symbol>` | `<thay đổi cần đạt>` | `<E/AC hoặc command>` | `<khi nào phải trả Planner>` |

## 6. Acceptance

### 6.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | `<binary, measurable>` | `<command/manual method hoặc E-xx dùng chung>` |

### 6.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `<risk>` | `<mitigation; FAST có thể một dòng>` |

## 8. Open Questions

- None.

## 9. Planner Resolution

Tier 1 append sau review/audit. FAST resolve trực tiếp từ HANDOFF; STANDARD/CRITICAL resolve từ AUDIT.

| Round | Decision | Reason |
|---|---|---|

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `<YYYY-MM-DD>` | Initial contract | Initial |
