# REC-001 cross-repo evidence handoff

- Message-ID: `HRP-CRM-MSG-011` (evidence handoff, không phải ACK mới).
- HRP baseline: `a49ceaa83ffa986bf939823a4e9f2c803a0649d6` (origin/main sau PR #25).
- Neutral authority: `https://github.com/nobita6986/hrp-integration-contracts`, revision `reconciliation/hrp/P0-C/decisions/HRP-CRM-REC-001/r2/`, immutable commit `be4ad9cfee3ba93ee75601581ca895309810a62f`.
- Prior decision: `2accd9a183333b412203e3dfb155893579afa47a`; r2 bổ sung provenance, không tự ban hành quyết định Owner mới.

## Decision disposition

| Item | State | Boundary |
|---|---|---|
| REC-001 | `OWNER_APPROVED` | CRM: channel/contact/connection; HRP: canonical person trong organization, không cross-org mặc định; effective deny = union; mỗi bên chỉ gỡ deny của mình; chặn outbound, không chặn intake/review/read. |
| REC-001-OPS | `OPEN/PROPOSED` | TTL/freshness, propagation, cache/invalidation, resync, recovery, unavailable behavior chưa chốt; không chọn fail-open hoặc fail-closed. |
| PlacementCase | Canonical HRP | CRM-stage/HRP-status wire mapping và transition semantics vẫn `UNRESOLVED`. |

## Evidence và giới hạn

- HRP r3 ACK: `2ee99394a210fc51125523ceef9020812f893be2`.
- HRP verification supplement: `a0cd30e04a86a80975824f23208a9e3ecfc29cbd`. Claim cũ bị supersede không dùng lại; đặc biệt không coi `MatchingOutcomeResult` là event, availability patch là array, hay PlacementCase mapping chưa chốt là ownership chưa chốt.
- CRM ACK manifest SHA-256: `54cc0b813e7e7d31ef4844b126afe6f98cc04e1c55f3bc9a0177ab948a9d8e04`. ACK integrity không tương đương bilateral `ACCEPTED_SHARED`.
- Không sửa runtime, DB/migration, frozen contract hoặc bundle immutable; không merge/deploy. REC-001 approval không cấp phép triển khai khi REC-001-OPS/wire contract còn mở.

Manifest cùng thư mục hash UTF-8 LF không BOM của file này; immutable SHA của chính HRP commit nằm trong PR, vì commit không tự tham chiếu được.
