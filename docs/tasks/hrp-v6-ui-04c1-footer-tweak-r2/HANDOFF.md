# HANDOFF — `hrp-v6-ui-04c1-footer-tweak-r2`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-ui-04c1-footer-tweak-r2` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` (FAST bypass Tier 3) |
| Execution round | `1` |
| Baseline | `<Tier 2 fill from evidence/exec-head-before.txt — kỳ vọng ed3b784...>` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered:** `<Tier 2 fill — bullet ngắn từng RQ đã làm>`
- **Not delivered:** `<None>`
- **Changed:** `<Tier 2 fill — paths/symbols gắn STEP, chỉ trong §0 In-scope roots>`
- **Lane escalation:** `<No>`

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `verify-task.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md` | `<Tier 2 fill>` | `None` |
| — | `verify-handoff.ps1 -TaskPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/TASK.md -HandoffPath docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/HANDOFF.md` | `<Tier 2 fill>` | `None` |
| `AC-00` | `<Tier 2 fill>` | `<Tier 2 fill>` | `None` |
| `AC-01` | `<Tier 2 fill — RQ-01 background>` | `<Tier 2 fill>` | `None` |
| `AC-02` | `<Tier 2 fill — RQ-02 grid>` | `<Tier 2 fill>` | `None` |
| `AC-03` | `<Tier 2 fill — RQ-03 services>` | `<Tier 2 fill>` | `None` |
| `AC-04` | `<Tier 2 fill — RQ-04 + RQ-05 links + address>` | `<Tier 2 fill>` | `None` |
| `AC-05` | `<Tier 2 fill — RQ-06 + RQ-08 disabled + CTA>` | `<Tier 2 fill>` | `None` |
| `AC-06` | `<Tier 2 fill — RQ-07 helper text>` | `<Tier 2 fill>` | `None` |
| `AC-07` | `<Tier 2 fill — RQ-09 copyright>` | `<Tier 2 fill>` | `None` |
| `AC-08` | `<Tier 2 fill — RQ-10 + RQ-11 routes + disabled semantic>` | `<Tier 2 fill>` | `None` |
| `AC-09` | `<Tier 2 fill — RQ-12 touch target>` | `<Tier 2 fill>` | `None` |
| `AC-10` | `<Tier 2 fill — RQ-13 container>` | `<Tier 2 fill>` | `None` |
| `AC-11` | `<Tier 2 fill — RQ-14 panel>` | `<Tier 2 fill>` | `None` |
| `AC-12` | `<Tier 2 fill — RQ-15 headings>` | `<Tier 2 fill>` | `None` |
| `AC-13` | `<Tier 2 fill — RQ-16 input white>` | `<Tier 2 fill>` | `None` |
| `AC-14` | `Owner live visual review` | `<Tier 2 fill — placeholder Owner live review ghi sau deploy>` | `<Tier 2 fill — Tier 1 sẽ ghi closeout sau khi Owner confirm>` |

## 3. Evidence registry

Log ngắn để inline; chỉ tạo `evidence/*` cho output dài, LIVE transcript hoặc ảnh cần lưu.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `<Tier 2 fill — git rev-parse HEAD STEP-01>` | `<Tier 2 fill>` | `evidence/exec-head-before.txt` |
| `E-02` | `<Tier 2 fill — git status --porcelain STEP-01>` | `<Tier 2 fill>` | `evidence/working-tree-before.txt` |
| `E-03` | `<Tier 2 fill — npm run test:unit --reporter=basic STEP-01>` | `<Tier 2 fill>` | `evidence/expected-failure-set-before.txt` |
| `E-04` | `<Tier 2 fill — STEP-03 layout>` | `<Tier 2 fill>` | `evidence/ac-step03-footer-layout.txt` |
| `E-05` | `<Tier 2 fill — STEP-04 content>` | `<Tier 2 fill>` | `evidence/ac-step04-footer-content.txt` |
| `E-06` | `<Tier 2 fill — STEP-05 copyright + disabled>` | `<Tier 2 fill>` | `evidence/ac-step05-copyright-disabled.txt` |
| `E-07` | `<Tier 2 fill — STEP-06 mobile + touch target>` | `<Tier 2 fill>` | `evidence/ac-step06-mobile.txt` |
| `E-08` | `<Tier 2 fill — STEP-07 ContactForm>` | `<Tier 2 fill>` | `evidence/ac-step07-contactform.txt` |
| `E-09` | `<Tier 2 fill — STEP-08 reachability>` | `<Tier 2 fill>` | `evidence/ac-step08-reachability.txt` |
| `E-10` | `<Tier 2 fill — npm run typecheck>` | `exit 0` | `evidence/typecheck.txt` |
| `E-11` | `<Tier 2 fill — npm run test:unit>` | `<Tier 2 fill>` | `evidence/test-unit.txt` |
| `E-12` | `<Tier 2 fill — npm run build>` | `exit 0` | `evidence/build.txt` |
| `E-13` | `<Tier 2 fill — STEP-99 invariants>` | `<Tier 2 fill>` | `evidence/ac00-invariants.txt` |
| `E-14` | `<Tier 2 fill — STEP-99 gates>` | `<Tier 2 fill>` | `evidence/ac-gates.txt` |
| `E-15` | `<Tier 2 fill — STEP-99 diff allowlist>` | `<Tier 2 fill>` | `evidence/ac99-touched-files.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| — | — | `<Tier 2 fill — None hoặc BLK-xx>` | `<Tier 2 fill>` |

## 5. Final status

- `<Tier 2 fill — một câu: vì sao đủ READY_FOR_REVIEW hoặc vì sao BLOCKED>`

> Handoff status: `READY_FOR_REVIEW` (FAST lane; Owner live visual review AC-14 thuộc Owner sau deploy; không cần Tier 3 audit)
