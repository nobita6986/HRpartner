# HANDOFF: hrp-v6-p1c-new-ui-restyling

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-p1c-new-ui-restyling` |
| Work type | `DESIGN` |
| Audit mode (phải khớp TASK) | `DESIGN_AUDIT` |
| Spec version | `v1.2` |
| Execution round | `4` |
| Current audit round | `0` |
| Executor | `Tier 2` |
| Baseline | `main @ 3e6131b148414e03e75905606b33b0e5efb4d1aa`; adopted mockup blob `f52a2b4d62124f87fc3ae4e6a530880e9fdb35e8`, size `36320` |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-09-08 Asia/Bangkok` |

## 1. Outcome Summary

R4 hoàn tất Warm Professionalism G27 restyle cho `/` theo artifact đã được Tier 1 adopt. Trang giữ H1 bảo thủ `Việc làm nhà máy, kho vận tại các khu công nghiệp`, giữ nguyên query/search/facet/pagination/request-race/apply contracts, và ghép đúng năm landing module.

`ReferralInviteStrip` được tái xuất thay vì chép JSX. `BestJobsSection` dùng skeleton trung tính `aria-busy` vì public query chưa repoint sang `JobPosting`; `AreasSection` chỉ render `facets.areas`. Không tạo CompanyCard/TopCompaniesSection, không dùng tên công ty hay asset mockup từ xa. Chỉ thêm token thiếu `--color-surface-warm`; không thêm dependency, không đổi schema/service/API/admin/frozen tests.

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-02`, `RQ-03` | `app/globals.css` | `DONE` — chỉ thêm `--color-surface-warm`; token fixed còn lại đã tồn tại; bảy typography key giữ nguyên | Không |
| `STEP-02` | `RQ-01`, `RQ-09` | `src/domains/job-board/components/landing/` | `DONE` — đúng năm file, mỗi file dưới 200 dòng, không CompanyCard/TopCompaniesSection | Không |
| `STEP-03` | `RQ-04`, `RQ-10` | `app/(portal)/page.tsx`; `ReferralInviteStrip` | `DONE` — import năm module; referral dùng re-export; source locks giữ nguyên | Không |
| `STEP-04` | `RQ-05`, `RQ-08`, `RQ-11` | H1; `BestJobsSection`; `AreasSection` | `DONE` — giữ H1 đã resolve, truthful skeleton, areas từ facets | Không |
| `STEP-05` | `RQ-06`, `RQ-07` | Hai frozen tests | `DONE` — 23/23 và 25/25 pass; hash và diff không đổi | Không |
| `STEP-06` | `RQ-08` | Git dependency ancestry | `DONE` — Phase 1A `a4ab9f0` và Phase 1B `cf887c0` ACCEPTED trước R4 | Không |
| `STEP-07` | Tất cả | `HANDOFF.md`; `evidence/` | `DONE` — evidence thực và handoff R4 được ghi; không tự audit | Không |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `powershell -NoProfile -File .\.ai-pipeline\scripts\verify-task.ps1 -TaskPath C:\CodeApp\HrP\docs\tasks\hrp-v6-p1c-new-ui-restyling\TASK.md -RepoRoot C:\CodeApp\HrP` | `RESULT: PASS`; exit `0` | Contract v1.2 đạt mechanical gate trước bàn giao; `evidence/ac12-validation.txt` | Không |
| `AC-01` | `Get-ChildItem src/domains/job-board/components/landing/*.tsx` và `Get-Content ... | Measure-Object -Line` | exit `0`; `5` file; line counts `38,39,22,1,20` | Đúng inventory và dưới 200 dòng; `evidence/ac01-components.txt` | Không |
| `AC-02` | `Select-String -Path src/domains/job-board/components/landing/*.tsx -Pattern 'export (function|\{)'` rồi đối chiếu export mỗi file | exit `0`; `5` exports cho Hero/Referral/BestJobs/Areas/Search | Mỗi file có một trách nhiệm; `evidence/ac01-components.txt` | Không |
| `AC-03` | `git diff -- app/globals.css` và `Select-String src/domains/job-board/components/landing/*.tsx '#[0-9a-fA-F]{6}'` | exit `0`; `1` token thêm; `HEX_HITS=0` | Chỉ thêm surface-warm, không hex trong component; `evidence/ac03-tokens.txt` | Không |
| `AC-04` | `Select-String app/globals.css '^\s*--text-'` và targeted token tests | exit `0`; bảy key cũ giữ nguyên; token parity `26/26` pass | Typography contract giữ nguyên; `evidence/ac03-tokens.txt` | Không |
| `AC-05` | `node docs/tasks/hrp-v5-go-live-09-public-board-architecture/evidence/gl09-locks.mjs` và source import probe | exit `0`; năm import đúng một lần; toàn bộ locks `OK` | Referral reuse, focus/tap and source locks preserved; `evidence/ac05-integration.txt` | Không |
| `AC-06` | `npm run dev -- -p 3117` rồi `GET http://localhost:3117/` và đọc JSX | exit `0`; HTTP `200`, `41639` bytes; một H1, Best Jobs, Search, referral có mặt | Areas không có trong initial SSR khi facets rỗng, đúng conditional render; `evidence/ac05-integration.txt` | Chưa có browser screenshot; runtime HTTP và source wiring đã đo |
| `AC-07` | `npm run test:unit -- public-card-truth`; `git hash-object` và `git diff -- src/domains/job-board/public-card-truth.test.ts` | exit `0`; `23/23` pass; hash `431f650f00be8bcf77e81eb83501311b1573ddcc`; diff rỗng | Frozen truth fence nguyên vẹn; `evidence/ac07-fences.txt` | Không |
| `AC-08` | `npm run test:unit -- marketplace-inventory`; `git hash-object` và `git diff -- src/domains/applications/marketplace-inventory.static.test.ts` | exit `0`; `25/25` pass; hash `e5bee46659b11b63c93cb31bc755f6bcc7ad6f23`; diff rỗng | Search/facet fence nguyên vẹn; `evidence/ac07-fences.txt` | Không |
| `AC-09` | `git log --all --oneline --grep 'Phase 1A ACCEPTED'` và `--grep 'Phase 1B ACCEPTED'` | exit `0`; commits `a4ab9f0`, `cf887c0` | Hai dependency ACCEPTED trước execution; `evidence/ac09-dependencies.txt` | Worktree task copies thuộc luồng khác không dùng làm authority |
| `AC-10` | `Select-String src/domains/job-board/components/landing/*.tsx 'TopCompaniesSection|CompanyCard'` | exit `0`; `COMPANY_HITS=0` | Không tạo bề mặt company bị cấm; `evidence/ac10-truthful-output.txt` | Không |
| `AC-11` | `Select-String src/domains/job-board/components/landing/*.tsx 'Luxshare|Goertek|Brother|Foxconn|Pegatron'` và inspect `aria-busy` | exit `0`; `COMPANY_HITS=0`; `aria-busy=true` | Skeleton không bịa posting/company/salary/status/link; `evidence/ac10-truthful-output.txt` | Public query chưa repoint nên intentional skeleton |
| `AC-12` | `npm run typecheck`; `npm run build`; `npm run test:unit` | all exit `0`; build `29/29`; unit `113` files, `1740` tests | Full validation pass; `evidence/ac12-validation.txt` | Existing lint/CSS import warnings không chặn build |

## 4. Changed Deliverables

- `app/(portal)/page.tsx` — ghép Hero, Best Jobs fallback, Areas, Search wrapper và referral re-export; giữ logic hiện có.
- `app/globals.css` — thêm duy nhất `--color-surface-warm: #faf9f7`.
- `src/domains/job-board/components/landing/hero.tsx`.
- `src/domains/job-board/components/landing/referral-strip.tsx`.
- `src/domains/job-board/components/landing/best-jobs-section.tsx`.
- `src/domains/job-board/components/landing/areas-section.tsx`.
- `src/domains/job-board/components/landing/search-section.tsx`.
- `docs/tasks/hrp-v6-p1c-new-ui-restyling/HANDOFF.md` và bảy evidence file trong `evidence/`.
- Dependency/schema/migration/service/API/admin/config: không thay đổi.
- Git: không commit, push, merge hoặc deploy; không stage TASK/AUDIT hay cleanup thay đổi luồng khác.

## 5. Deviations

| ID | Type | Evidence | Impact | Decision/closure |
|---|---|---|---|---|
| `LIM-01` | `Limitation` | Local SSR trả HTTP 200 nhưng `AreasSection` không xuất hiện trước khi client nhận `facets.areas` | Không ảnh hưởng contract; component trả null khi danh sách rỗng và wiring dùng đúng `facets.areas` | Tier 3 có thể kiểm bằng source + client data fixture; không cần contract change |
| `LIM-02` | `Limitation` | Build còn warning lint/CSS import có sẵn, nhưng compile/static generation/typecheck/test đều exit 0 | Không chặn deliverable; không mở rộng scope sang file không liên quan | Ghi trung thực trong `evidence/ac12-validation.txt` |
| `LIM-03` | `Limitation` | Shared index đã có staged `docs/tasks/hrp-v6-credential-rotation-posture/HANDOFF.md` từ luồng khác | Cached diff toàn repo không phải tập riêng của R4 | Bảo toàn path đó; R4 chỉ stage explicit allowlist và không unstage luồng khác |

## 6. Evidence Index

- `evidence/ac01-components.txt` — AC-01/02 inventory, exports, line counts.
- `evidence/ac03-tokens.txt` — AC-03/04 token delta, literal scan, compiled utilities.
- `evidence/ac05-integration.txt` — AC-05/06 imports, frozen source locks, runtime smoke.
- `evidence/ac07-fences.txt` — AC-07/08 targeted tests, hashes, empty diffs.
- `evidence/ac09-dependencies.txt` — AC-09 accepted dependency commits.
- `evidence/ac10-truthful-output.txt` — AC-10/11 prohibited output and truthful fallback.
- `evidence/ac12-validation.txt` — AC-12 typecheck/build/full tests and auxiliary gates.
- Gate fingerprints: `verify-task=e36b83dfbf7c860e320d5409535b82001cab574e`; `verify-handoff=e1af8549b9dd73d8c569d66493b6e527fae021f5`; `verify-audit=e1edaebac456da16cb618dca2607e7f46b1c4358`; `gate-lib=6daa689a33604f873f2e9f2181a741bfe4a55a9f`.

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.1` | `BLOCKED` | Mandatory TASK gate FAIL A-04/T-02/T-03/T-05; dừng trước source mutation. |
| `2` | `v1.1` | `BLOCKED` | Mechanical gate PASS; semantic preflight dừng vì Q-02 còn giao quyết định H1. |
| `3` | `v1.1` | `BLOCKED` | Mockup bắt buộc không tồn tại tại baseline cũ; detached blob không có contract authority. |
| `4` | `v1.2` | `READY_FOR_AUDIT` | Artifact được adopt tại baseline mới; implementation, frozen fences, full validation và runtime smoke đều pass. |

> Handoff status: READY_FOR_AUDIT
