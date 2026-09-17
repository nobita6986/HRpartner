# HRP V6 — KẾ HOẠCH GIẢI QUYẾT TỒN ĐỌNG

> **Status:** APPROVED một phần — `D-1`, `D-2` (kèm `D-2b`), `D-3`, `D-4`, `D-5`, `D-6` **đã chốt**
> (Owner trả lời/trực tiếp xác nhận + ủy quyền Tier 1 phân tích ngày 14/09). Credential §1.1: Owner quyết
> **giữ nguyên, rotate sau khi deploy production**.
> **Updated:** 2026-09-14 (revision 3 — sau khi N1 round-3/4/5 land lên `origin/main`)
> **Author:** Tier 1 (Planner)
> **Đo trên:** `origin/main` = `40cd9d4` (worktree local vẫn ở `50dedee` + WIP, **chưa fetch-merge**)
>
> ⚠ **§1.1 là sự cố credential ngày 14/09 — Owner đã quyết hoãn rotate tới sau deploy production.
> Đọc §1.1 trước khi dùng phần còn lại.**
> **Thứ bậc thẩm quyền:** THẤP HƠN `docs/TIER0_HANDOVER.md` §3. Tài liệu này là kế hoạch thực thi,
> **không** phải architecture authority, **không** thay `TASK.md`, và **không** phát hành hợp đồng nào.
> **Phạm vi:** toàn bộ tồn đọng đo được tính đến 14/09 — Admin UI quan hệ, N1 closeout, backlog task
> chưa terminal, CI/gate, và phần bị chặn bởi thiếu entity canonical.

---

## 0. Cách đọc tài liệu này

Mọi con số dưới đây là **đo trực tiếp** trên HEAD `50dedee`, kèm đường dẫn + số dòng để tự kiểm lại.
Không có suy diễn từ lời văn trong TASK/HANDOFF/AUDIT.

Ba nhãn trạng thái dùng xuyên suốt:

| Nhãn | Nghĩa |
|---|---|
| `IN-FLIGHT` | Đang có code chạy dở trên working tree hoặc đang chờ verdict. **Không xếp chồng.** |
| `DONE-STALL` | Code đã land/push nhưng tài liệu (TASK Status, roadmap, handover) chưa đóng. |
| `OPEN` | Chưa làm thật. |

Mục §12 ghi lại **6 quyết định đã chốt ngày 14/09** (Owner trả lời D-1, D-2/`D-2b`; ủy quyền Tier 1
phân tích D-3..D-6) kèm căn cứ đo được. §12.1 là việc kế tiếp theo thứ tự.

---

## 1. Bức tranh tồn đọng — 5 nhóm

| # | Nhóm | Bản chất | Nhãn |
|---|---|---|---|
| **A** | Admin UI không thể hiện được quan hệ giữa các đối tượng | Thiếu **tầng chi tiết** + thiếu **read service**; schema phần lớn đã đủ | `OPEN` |
| **B** | `hrp-v6-n1-intake-writer` — round-5 đã land, chờ Tier 0/Owner verify production deploy | TASK `v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5`; HANDOFF round 5; AUDIT Tier 3 LIGHT round-5 **PASS**. **N1 sắp ACCEPTED — còn 1 gate cuối:** Tier 0/Owner xác minh Vercel deploy + smoke admin intake | `IN-FLIGHT` (gate cuối, không code) |
| **C** | 21 task có `Status` chưa terminal | Phần lớn là **stale** (footer r3..r9, hero-width, monogram, carousel đã land từ lâu) | `DONE-STALL` (đa số) |
| **D** | CI đỏ + lane integration chưa chạy được | `npm test` là lane không an toàn; `DATABASE_URL_TEST` **đã cấp và đã xác minh** (§10.1) | `OPEN` (một phần đã mở khóa) |
| **E** | Thiếu entity canonical: Ref / Handling / Beneficiary / Placement / ServiceModel | Thuộc N2–N3 theo `TIER0_HANDOVER` §5 | `BLOCKED-BY-DESIGN` |

**Kết luận một câu:** nhóm A là thứ Owner nhìn thấy và bức xúc; nhưng A chỉ giải quyết được ~70% ngay
(Cây Client→Project→Job và Cây LaborProfile), còn "người hưởng hoa hồng" đúng nghĩa thì nằm ở nhóm E và
phải chờ N2. Plan này tách rõ hai phần để không hứa cái chưa có dữ liệu.

### 1.2 Tiến triển từ rev 2 → rev 3 (14/09/2026, đo trên `origin/main` = `40cd9d4`)

Một stream song song (D-1) đã đưa N1 từ round-2 lên **round-5** và land lên `origin/main` bằng 2 commit:

| Commit | Nội dung đo được |
|---|---|
| `55f4180` (15:59) | `hrp-v6-n1-intake-writer round-5`: AC-05 concurrent retry dùng handler intake **thật** (`createCandidateSubmissionFromIntake` qua `withHrManagerContext` — thay thế handler giả `admin.laborProfile.create` của round-4 theo yêu cầu Tier 0); pre-create LaborProfile với phone deterministic để EXACT_MATCH; verify đủ 3 điều kiện (submission count + case/profile trong DB + replay response); **gộp luôn SAVEPOINT fix** của round-3 vào. Evidence do commit message khai: integration N1 **9/9 PASS** (`hrp_mp2_test`), lane 18 file 361 pass + 2 skip, unit **2173/2173 PASS**, Tier 3 LIGHT round-5 **PASS**. Scope: 8 file (`TASK`/`HANDOFF`/`AUDIT` + `src/domains/talent/**` + `tests/db/intake-writer-integration.test.ts` + `evidence/neon_branch_gate.r4.stdout.txt`) |
| `40cd9d4` (17:13) | `docs(planner)` — Cursor stream viết tracker round-5 vào `PLANNER_HANDOVER.md` (docs-only), bao gồm **smoke test production an toàn**: `GET /` → 200, `GET /viec-lam` → 200, `POST /api/admin/intake/staff` (no auth) → 401, `POST /api/jobs/apply` (no auth) → 401 — chứng minh URL sống và auth gate hoạt động, **chưa** chứng minh Vercel đã rebuild từ `55f4180` |

Trạng thái N1 tại `origin/main`:

- `TASK.md`: `v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5` (round hiện tại 5; audit round 4; lịch sử
  verdict: round-2 CONDITIONAL → round-3 FAIL → round-4 PASS → round-5 PASS, Tier 0 `REVISION_REQUIRED`).
- `HANDOFF.md`: round 5, `READY_FOR_AUDIT_ROUND_5`.
- `AUDIT.md`: Tier 3 LIGHT round-5 **PASS** (delta review so với round-4; scope worktree
  `C:\CodeApp\HrP-worktrees\tier1-n1-intake-writer-r2`).
- `BLK-01` (thiếu `DATABASE_URL_TEST`): **đóng** — integration test chạy thật 9/9 trên `hrp_mp2_test`.
  `BLK-02` (2 typecheck fail pre-existing ở `marketplace-browse.routes.test.ts`): **vẫn mở**, Tier 2.
- Trong 8 file của round-5 có **`evidence/neon_branch_gate.r4.stdout.txt` ở repo ROOT** — file nhị phân
  (UTF-16 có BOM, 1040 bytes) nằm ngoài mọi `docs/tasks/**/evidence/` convention. Không phải secret
  (đã ghi trong commit message là output của branch gate), nhưng W0.3 nên dời về đúng thư mục evidence
  của task hoặc ghi chú lý do giữ ở root.

Hệ quả cho plan này:

1. **§2.1 cũ ("N1 round 3 đang dở") đã lỗi thời** — SAVEPOINT fix đã land trong `55f4180`. Xem §2.1 mới.
2. **W0.1 đổi nội dung**: không còn là "đóng N1 từ CONDITIONAL" mà là **ghi nhận N1 ACCEPTED sau gate
   cuối** (Tier 0/Owner verify Vercel deploy + smoke admin intake bằng tài khoản ADMIN thật
   → 201 + verdict).
3. **W6.1 (`BLK-01`) đóng** — DB test đã chứng minh chạy được thật. Việc còn lại là giữ quy trình
   (biến môi trường cấp máy + branch gate mỗi lần chạy).

### 1.3 ⚠ SỰ CỐ CREDENTIAL ngày 14/09 — Owner đã quyết hoãn rotate tới sau deploy production

**Chuyện gì đã xảy ra.** Khi đọc `C:\cre_hrp.txt` theo chỉ đạo của Owner (D-2), Tier 1 dùng một đoạn
PowerShell in ra "khóa + giá trị đã che". Đoạn che **chỉ xử lý dòng dạng `KEY=value`**; file này chứa
giá trị **trần không có khóa**, nên chúng rơi vào nhánh "không parse được" và nhánh đó in ra *token đầu
tiên* của dòng — với một connection string thì token đầu tiên **là cả URL, kèm user và password**.

**Hậu quả:** ba giá trị nhạy cảm đã bị in ra terminal và nằm trong transcript phiên làm việc:

| # | Loại giá trị | Mức độ |
|---|---|---|
| 1 | Password role **`neondb_owner`** (quyền cao nhất trên DB) | **Nghiêm trọng** |
| 2 | Password role **`app_user_writer`** | **Nghiêm trọng** |
| 3 | **Neon API key** — có quyền tạo/xóa branch, tức là có thể phá dữ liệu | **Nghiêm trọng nhất** |

Tier 1 **không** ghi ba giá trị này vào bất kỳ file nào trong repo, không đưa vào plan này, và không lặp
lại trong báo cáo. Nhưng chúng đã hiện ra màn hình của Owner và nằm trong log phiên.

**Quyết định của Owner (14/09/2026): giữ nguyên hiện trạng, rotate sau khi deploy production** (nối tiếp
quyết định hoãn toàn bộ rotate từ 01/09 ở `PLANNER_HANDOVER.md` §10). Tier 1 ghi nhận và không nhắc lại
như một việc chặn — chỉ giữ lại đây làm truy vết. Khi tới checkpoint rotate: rotate cả ba (password
`neondb_owner`, password `app_user_writer`, revoke Neon API key — API key ưu tiên số một vì xóa được
branch), kiểm tra Neon audit log, và `C:\cre_hrp.txt` giữ nguyên **ngoài repo**, không bao giờ chép vào
`.env` tracked / `TASK.md` / `evidence/` / commit.

**Bài học rút ra cho pipeline (đã áp dụng ngay trong phần còn lại của tài liệu này):** khi đọc file có
thể chứa secret, phải in **số đếm / boolean / độ dài**, không in "token đầu tiên" của dòng chưa parse
được. Mọi probe DB ở §10 `W6.1` bên dưới đều đi qua `node -e` tự đọc file, **secret không đi qua text
lệnh và không xuất hiện trong output**.

---

## 2. Đang chạy — vùng cấm xếp chồng (rev 3)

> **CẢNH BÁO ĐỒNG BỘ HAI WORKTREE.** Worktree này (`C:\CodeApp\HrP`) đang ở `50dedee`, **lạc 2 commit sau
> `origin/main` (`40cd9d4`)**. Một stream song song (Cursor, worktree `tier1-n1-intake-writer-r2`) đã land
> N1 round-5. Mọi con số trong plan này đã đo lại trên `origin/main`; riêng diff local dưới đây là WIP
> **chưa hòa** — không được commit/push trước khi rebase lên `40cd9d4`, và §2.1 liệt kê chính xác phần
> nào trong đó đã lỗi thời.

### 2.1 WIP local trong `src/domains/talent/**` — MỘT PHẦN ĐÃ LỖI THỜI

Diff local so với `origin/main` (`git diff origin/main -- src/domains/talent/`):

```
 M src/domains/talent/intake-writer.service.test.ts        −1 dòng (xóa mock $executeRawUnsafe)
 M src/domains/talent/placement-case.service.test.ts      +13 / −2 (assert SAVEPOINT/ROLLBACK TO)
 M src/domains/talent/placement-case.service.ts            1 dòng comment (bỏ chữ "verified round-3 fix")
```

Phân tích từng hunk:

- **SAVEPOINT fix (`placement-case.service.ts` + test): ĐÃ LỖI THỜI** — `55f4180` đã gộp fix này
  ("SAVEPOINT fix cho placement-case.service.ts (round-3)" trong commit message). Diff local chỉ còn
  chênh 1 dòng comment. **Không ai được "land lại" fix này.**
- **Xóa mock `$executeRawUnsafe` trong `intake-writer.service.test.ts`: CẦN XÁC MINH** — `origin/main`
  có mock này, local xóa. Chưa rõ stream nào đúng; phải đọc `intake-writer.service.ts` tại `origin/main`
  xem `createCandidateSubmissionFromIntake` có gọi `$executeRawUnsafe` trực tiếp không (qua SAVEPOINT
  trong `openPlacementCase`) rồi mới quyết giữ hay bỏ. **Đây là mâu thuẫn duy nhất cần hòa, và là việc
  nhỏ (1 dòng mock).**

⇒ Ràng buộc cập nhật: **cấm mọi thay đổi mới trong `src/domains/talent/**`** cho tới khi (i) hòa xong
1 dòng mock này với `origin/main`, và (ii) N1 sang `ACCEPTED` sau gate cuối (§12.1 mục 2).

### 2.2 Bốn file rác ở root (untracked)

```
orca.bat (19 B)   orca-status.bat (8 B)   temp.txt (13904 B)   temp3.txt (683 B)
```

Tạo ngày 14/09 09:22–09:26. **Đã đo nội dung:** `temp.txt` (58 dòng) và `temp3.txt` (6 dòng) chỉ là
output `Get-ChildItem` của `docs/tasks` và `docs/tasks/hrp-v6-n1-intake-writer` — scratch regenerable,
**0 hit** mẫu secret. `orca.bat` = `@echo off` / `exit 0`, `orca-status.bat` = `exit 0` — shim no-op,
có thể đang đỡ cho một tool nào đó nên **không xóa**.

**Đã chốt (D-6):** `git check-ignore` xác nhận `temp.txt` và `orca.bat` **chưa được che** ⇒ rủi ro thật là
bị nuốt bởi một lệnh `git add` rộng (vốn đã cấm). Cách xử lý không phá hủy: thêm `/temp*.txt` và
`/orca*.bat` vào `.gitignore`. `.ai-pipeline-bak/` **đã được che sẵn** bởi `.git/info/exclude:7` ⇒ không
cần làm gì, giữ nguyên backup Owner chủ đích tạo.

### 2.3 Lane UI đang mở thật (không phải stale)

| Task | Spec | Trạng thái đo được |
|---|---|---|
| `hrp-v6-ui-02-homepage-demo-recomposition` | `v1.8` | `READY_FOR_EXECUTION` — Tier 3 FAIL round 4 |
| `hrp-v6-ui-03-homepage-huongb-visual-parity` | `v1.5` | `BLK-03` mở thành correction round 2 cho **36 test fail mới** |
| `hrp-v6-ui-04d-section-render` | `v1.7` | `READY_FOR_EXECUTION` — `TIER0_HANDOVER` §10.4 cho chạy độc lập |
| `hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11` | `v1.0` | `READY_FOR_REVIEW` |
| `hrp-v6-credential-rotation-posture` | `v1.2` | `READY_FOR_EXECUTION` |

⇒ Trước khi mở bất kỳ lát admin UI nào, W0 phải **chốt lại xem lane nào thật sự còn sống**. Mở lát mới
trên một backlog trạng thái sai là nguyên nhân chính khiến kế hoạch trước đây trượt.

---

## 3. Ràng buộc cứng khi xếp thứ tự

1. **~~Một stream tại một thời điểm~~ → ĐÃ NỚI (D-1, Owner 14/09):** W1/W2 (UI thuần, không schema, không
   đụng `src/domains/talent/**`) **được chạy song song** với N-lane. Mọi việc đụng `schema.prisma`,
   migration, hoặc `src/domains/talent/**` **vẫn chỉ một stream**.
2. **Không hai agent cùng sở hữu `prisma/schema.prisma` hoặc cùng sinh migration.**
3. **Không dùng đầu V7 để sửa V6 còn dang dở** (`TIER0_HANDOVER` §2.1).
4. **Không dựng control/nhãn UI khi không có dữ liệu thật chống lưng** (`v6-admin-rebuild` §8.2, §8.3).
5. **Không bao giờ reuse slug task đã hoàn thành.**
6. Audit mode: `NONE` cho docs / read-only discovery / UI reversible; `LIGHT` cho schema, migration,
   permission/RLS, read service đụng RLS scope, authority switch (`TIER0_HANDOVER` §9).
7. `.env` trỏ `neondb` = **PRODUCTION**. Lane unit canonical là `npm run test:unit`. Không dùng `npm test`
   (bare `vitest run` đọc `DATABASE_URL` production). Không `npm run build` khi chỉ khảo sát
   (`copy-static.mjs` làm bẩn `public/index.html`).

---

## 4. W0 — Dọn trạng thái tài liệu (làm TRƯỚC; 1 task docs; audit `NONE`)

Không có W0 thì mọi ước lượng phía sau đều đọc trạng thái sai.

| ID | Việc | Bằng chứng / đích |
|---|---|---|
| `W0.1` | Ghi nhận N1 ACCEPTED sau gate cuối: Tier 0/Owner verify Vercel đã rebuild từ `55f4180` + smoke admin intake bằng tài khoản ADMIN thật (`POST /api/admin/intake/staff` → 201 + verdict) → viết Planner Resolution → `Status` → `ACCEPTED` | `TASK.md` tại `origin/main`: `v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5`; `HANDOFF.md` round 5; `AUDIT.md` Tier 3 LIGHT round-5 **PASS**; smoke an toàn tại `40cd9d4` chỉ mới 200/401 (chưa chứng minh rebuild) |
| `W0.2` | Hòa 1 dòng mock `$executeRawUnsafe` trong `intake-writer.service.test.ts` với `origin/main` (§2.1) + dời `evidence/neon_branch_gate.r4.stdout.txt` từ repo root về `docs/tasks/hrp-v6-n1-intake-writer/evidence/` (hoặc ghi chú lý do giữ ở root) — làm **trước** `W0.1` | `git diff origin/main -- src/domains/talent/`; file UTF-16 1040 bytes ở root, ngoài mọi evidence convention |
| `W0.3` | Rà **21 task** có `Status` chưa terminal → phân loại `DONE-STALE` / `OPEN` / `ABANDONED`, sửa từng `TASK.md` + `docs/PLANNER_HANDOVER.md` §0 | Danh sách đầy đủ ở Phụ lục B |
| `W0.4` | Sửa `docs/PLANNER_HANDOVER.md`: file có **YAML key trùng** (`v6_foundation`, `ui04_status`, `held_draft`, `queue_authority` mỗi khóa hai lần) ⇒ không parse được; `current_task` chứa văn xuôi thay vì slug; `roadmap_source` trỏ hai file không tồn tại | Đã đo trong khảo sát 14/09 |
| `W0.5` | Quyết định số phận `.ai-pipeline-bak/` — **53 file untracked, trùng byte với `.ai-pipeline/`** (README.md hash identical). `.ai-pipeline/` đã được khôi phục nguyên vẹn và tracked ⇒ gate chạy được lại | `git ls-files .ai-pipeline` = 53; `.ai-pipeline-bak` = 0 |
| `W0.6` | Sync `docs/V6/v6-roadmap.html` sau khi các Status đổi (theo roadmap-sync rule) | — |
| `W0.7` | Thêm `/temp*.txt` và `/orca*.bat` vào `.gitignore` (thực thi D-6). **Không xóa file**, không đụng `.ai-pipeline-bak/` (đã được `.git/info/exclude:7` che sẵn) | `git check-ignore` xác nhận hai nhóm này chưa được che |
| `W0.8` | Đổi `package.json` scripts theo D-5: `"test"` → alias `vitest.unit.config.ts`, thêm `"test:prod-db-unsafe"` cho lane cũ. Đã đo: **0 consumer** nên blast radius = 0 | `.github/workflows/ci.yml:54,86`; `verify-audit.ps1:285` (`S-11`) |

**Slug đề xuất (mới, chưa phát hành):** `hrp-v6-docs-state-reconciliation`
**Effort:** ~0.5–1 ngày. **Rủi ro:** thấp, thuần docs. **Giá trị:** mở khóa toàn bộ phần còn lại.

---

## 5. W1 — Sửa 5 defect Admin (không schema, không migration)

Tất cả đều đo được, đều là "UI đang nói dối về dữ liệu" hoặc "trang tồn tại mà không vào được".

| ID | Defect | Bằng chứng | Bản sửa | Audit |
|---|---|---|---|---|
| `AD1` | 5 trang tồn tại nhưng **không có trong nav** ⇒ toàn bộ bề mặt hoa hồng, users, vendors, job-postings không vào được | `src/shared/ui/role-guard/role-guard-layout.tsx:110-125` — `ADMIN_NAV_PHASE4` 13 mục phẳng; 19 trang tồn tại. **Đã đo: cả 5 trang đều functional** — `users` 120 dòng, `vendors` 209, `commission/policies` 274, `commission/ledger` 239, `jobs/job-postings` 308; **0** marker `TODO`/`FIXME`/`Đang phát triển` | **Đã chốt (D-4):** đưa cả 5 vào nav, **nhóm theo quy trình** (Nhu cầu & Tuyển / Con người / Tài chính / Hệ thống), không nối dài danh sách phẳng. Phải land **cùng task với `AD3`** để trang hoa hồng không bị phơi ra khi còn hiện ID thô | `NONE` |
| `AD2` | Trang Nhân sự hiển thị + lọc trên field **không tồn tại** | `app/admin/workers/page.tsx` khai `WorkerStatus = ACTIVE` \| `ON_LEAVE` \| `SUSPENDED` \| `TERMINATED`; schema `Worker` **không có `status`** (chỉ `profileStatus` / `employmentStatus` / `riskStatus`); `src/shared/auth/worker-projection.ts:98-123` không trả `status`; `app/api/workers/route.ts:48` làm `where.status = status` | Bỏ type tự khai; render 3 state machine thật bằng **nhãn chữ**; sửa filter API theo field có thật. `tsc` không bắt được vì `where` typed `Record<string, unknown>` ⇒ phải có test | `LIGHT` (đụng read scope) |
| `AD3` | "Người hưởng hoa hồng" hiển thị bằng **8 ký tự cuối của một ID** | `app/admin/commission/ledger/page.tsx:177-180` — `r.ctvId.slice(-8)`, `r.workerId.slice(-8)`; cột `CTV` / `Worker` không tên, không link | **Đã chốt (D-3): join tay ở read service ngay trong W1**, không migration. Xem §9.2 cho phân tích RLS và phương án FK lâu dài ở N2 | `LIGHT` |
| `AD4` | "Tin tuyển dụng" thực ra là danh sách **Project**, và nhét 3 khái niệm vào 1 trang | `app/admin/jobs/page.tsx:145` fetch `/api/projects?take=50`; `:17` `type Tab = 'jobs'` \| `'submissions'` \| `'claims'` | Đổi nhãn đúng bản chất, hoặc trỏ đúng `JobOpening`. Tách Submissions/Claims về đúng chỗ theo §3.2 | `NONE` |
| `AD5` | `/admin` có 3 KPI thật nhưng thân trang vẫn là **module picker** | `app/admin/page.tsx` — `loadOverviewMetrics` (KPI thật) + `SECTION_CARDS` (điều hướng phẳng) | Nhóm card theo **quy trình vận hành** (Nhu cầu → Tuyển → Người → Bố trí → Tiền), không theo module | `NONE` |

**Slug đề xuất:** `hrp-v6-admin-truth-defects` (gộp AD1..AD5 — cùng vùng `app/admin/**` + 2 API, blast radius nhỏ).
**Effort:** ~2–3 ngày. **Không migration.** **Cấm chạm** `src/domains/talent/**`.
**Ràng buộc thứ tự nội bộ:** `AD3` phải land **trước hoặc cùng lúc** với `AD1`, vì `AD1` phơi trang
commission ra nav.

---

## 6. W2 — Nền "trang chi tiết" dùng chung (điều kiện cần cho mọi cây quan hệ)

### 6.1 Vì sao phải làm trước

| Chỉ số | Giá trị | Ý nghĩa |
|---|---|---|
| Tổng số trang admin | **19** | — |
| Dynamic route (trang chi tiết) | **1** — `app/admin/jobs/job-postings/[id]` | Không có tầng chi tiết thì không có nơi nào để thể hiện quan hệ |
| Link chéo `/admin/...` trong toàn bộ admin | **7**, tất cả nằm trong cụm `jobs` | Không tồn tại đường đi Client→Project→Job→Người |
| Trang `'use client'` + `fetch`, `serverImports=0` | **13 / 19** | Mỗi trang tự viết lại fetch/loading/error/table ⇒ không có chỗ tái sử dụng component quan hệ |
| Server Component gọi thẳng domain service | **6 / 19** | Đây là pattern đúng, đã có sẵn — mở rộng theo hướng này |

`v6-admin-rebuild` §7.4 đã chốt nguyên tắc: *"Danh sách là cửa vào; trang chi tiết mới là nơi thể hiện
quan hệ đối tượng. Không mở modal nhiều tầng cho một chuỗi có từ ba cấp trở lên."*

### 6.2 Sản phẩm của W2

- `Breadcrumb` — đường dẫn đầy đủ, URL ổn định ở mỗi cấp.
- `<RelatedObjects>` — panel liệt kê object con, mỗi item là deep-link, **trạng thái bằng chữ** (không chỉ màu).
- Row deep-link thay cho modal (hiện `app/admin/workers/page.tsx` chỉ có modal "Sửa", row không bấm được).
- Empty-state có nhãn giải thích + hành động kế tiếp.
- Quy ước đọc: **Server Component gọi domain service trực tiếp**, không nhân bản mô hình 13 trang client+fetch.
- Pattern traversal đã chạy production và cần được tái sử dụng: `src/domains/job-board/public.service.ts:538-560`
  (`project → staffingOrders → slots`) — hiện **chỉ phục vụ trang public**, admin không dùng.

**Slug đề xuất:** `hrp-v6-admin-detail-foundation`
**Effort:** ~3 ngày. **Không migration.** Audit `NONE` (UI + component, reversible).

---

## 7. W3 — Cây A: Client → Project → JobOpening (schema đủ 100%)

### 7.1 Quan hệ đã tồn tại, chỉ chưa có ai đọc

```
ClientCompany.projects            schema.prisma:329
  └─ Project.staffingOrders       :381      Project.assignments :380   Project.submissions :382
       └─ StaffingOrder.slots     :406      .jobOpenings :407           .assignments :408
            └─ StaffingOrderSlot.neoJobOpenings :432  .submissions :433  .assignments :434
                 └─ JobOpening.slots :459
                      └─ ProjectAssignment.worker :662  .project :663
```

### 7.2 Lỗ hổng thật: **không có read API**

| Route `[id]` | HTTP method hiện có |
|---|---|
| `clients/[id]` | **PUT** — không có GET |
| `projects/[id]` | **PUT** — không có GET |
| `workers/[id]` | **PUT** — không có GET |
| `vendors/[id]` | **PUT** — không có GET |
| `staffing/orders/[id]` | GET, PATCH ✅ |
| `admin/applications/[id]` | GET ✅ |
| `tickets/[id]` | GET ✅ |
| `admin/commission-policies/[id]` | GET, PATCH ✅ |

Census toàn `app/api`: GET 47, POST 45, PATCH 4, PUT 4, DELETE 2 (80 route).
⇒ Bốn entity quan trọng nhất của Cây A **chỉ có đường ghi, không có đường đọc chi tiết**.

### 7.3 Việc phải làm

1. Read service + `GET /api/clients/[id]` — include `projects` (kèm đếm order/slot/assignment).
2. Read service + `GET /api/projects/[id]` — include `staffingOrders → slots → jobOpenings`, `assignments`, `submissions`.
3. Read service + `GET /api/job-openings/[id]` — slot, trạng thái tuyển/publish, xem trước đúng nội dung public,
   NLD đã quan tâm/ứng tuyển, người đang làm / đã nghỉ / đã chuyển.
4. Ba trang chi tiết `/admin/clients/{id}`, `/admin/projects/{id}`, `/admin/job-openings/{id}` dựng trên W2.

**Mọi query phải đi qua `withDbContext` để RLS GUC được set** (bài học `hrp-public-read-rls-dead`:
`$transaction` trần khiến bảng `FORCE ROW LEVEL SECURITY` trả 0 dòng — và `total: 0` **không** phải evidence PASS).

**Slug đề xuất:** `hrp-v6-admin-demand-tree`
**Effort:** ~4–5 ngày. **Không migration.** Audit `LIGHT` (read service mới đụng RLS scope).

---

## 8. W4 — Cây B: LaborProfile (cần read API mới, không migration)

### 8.1 Hiện trạng = 0

- Grep `LaborProfile|PlacementCase` trên toàn bộ `app/admin/**/*.tsx` = **0 hit**.
- API liên quan chỉ 2: `app/api/admin/intake/staff/route.ts` (**ghi**) và `app/api/staffing/talent-pool/route.ts`.
- **Không có read API nào cho LaborProfile hoặc PlacementCase.**
- Admin vẫn quản lý thẳng `Worker` — ngược với mô hình người canonical của V6.

### 8.2 Quan hệ đã có sẵn trong schema

```
LaborProfile.worker            schema.prisma:1395     .submissions :1397
                 .episodes     :1399                  .placementCases :1400
PlacementCase.laborProfile     :1473                  .submissions :1476
EmploymentEpisode.laborProfile :1436                  .worker :1437
Worker.assignments             :272                   .episodes :280
CandidateSubmission.laborProfile :573  .project :566  .worker :567  .ctv (User) :565
```

### 8.3 Việc phải làm (theo `v6-admin-rebuild` §7.8 + §7.9)

1. `labor-profile` read service: list (filter thật: của tôi / sắp hết hạn / kho chung / chưa hoàn thiện /
   cần đối chiếu trùng / chưa từng đi làm / đang làm / đã nghỉ) + **detail 360**.
2. `/admin/labor-profiles` — list, row deep-link, CTA **Tiếp nhận NLD** (không dùng `+ Thêm nhân viên`).
3. `/admin/labor-profiles/new` — form progressive disclosure 3 tầng (tiếp nhận nhanh → hoàn thiện → xử lý
   nghiệp vụ), dedup preview trước khi lưu, dùng chung `createOrMatchLaborProfile` (§8 nguyên tắc 17: public
   self-service và staff-assisted intake phải dùng chung authority).
4. `/admin/labor-profiles/{id}` — 8 khối theo §7.8: nhận diện & độ tin cậy match, tình trạng quan hệ,
   nguồn, người phụ trách, quyền hưởng hoa hồng, nhu cầu qua thời gian, lịch sử làm việc, hành động theo trạng thái.

### 8.4 Ranh giới cứng của W4

- **KHÔNG** làm "người đang phụ trách" / SLA / Company Pool — chờ N2 (`HandlingAssignment` chưa tồn tại).
  Khối §7.8 mục 4 phải hiển thị **"Chưa có dữ liệu"**, không suy diễn từ `ownerId`/`assignedToId`.
- **KHÔNG** làm "quyền hưởng hoa hồng" — chờ N2. Mục 5 chỉ được hiện `Chưa đủ điều kiện` khi không có dữ liệu.
- **KHÔNG** hiện nút `Convert` nếu LaborProfile đã có Worker (§7.8 mục 8, §8 nguyên tắc 12).
- Nhãn "Đang làm" / "Đã nghỉ" là **projection** từ episode/assignment có hiệu lực, phải có reconciliation,
  không thay lịch sử nguồn (§8 nguyên tắc 14 và 20).

**Slug đề xuất:** `hrp-v6-admin-labor-profile-workbench`
**Effort:** ~5–6 ngày (service + 3 trang). **Không migration.** Audit `LIGHT`.
**Phụ thuộc:** W2, và N1 round 3 đã land (dùng `PlacementCase` đọc được).

---

## 9. W5 — Phần bị chặn thật: Ref / Handling / Beneficiary / Placement (N2–N3)

### 9.1 Trả lời thẳng câu "người hưởng hoa hồng"

Hôm nay admin **không thể** hiện được mối quan hệ này, và đó **không phải lỗi UI**. Bốn entity canonical
chưa tồn tại trong `prisma/schema.prisma`:

| Entity cần | Trạng thái | Thuộc |
|---|---|---|
| `ReferralAttribution` (nguồn lịch sử) | **chưa có model** | N2 / V7.6 |
| `LaborProfileHandlingAssignment` (quyền xử lý 7 ngày, có lịch sử transfer/release) | **chưa có model** | N2 / V7.2c |
| `Beneficiary` / `CommissionBeneficiaryDecision` | **chưa có model** | N2 / V7.7 |
| `Placement` độc lập + lifecycle `SELECTED→CONFIRMED→EFFECTIVE→FAILED→CANCELLED` | **chưa có model** | N3 |
| `JobOpening.serviceModel` + `Placement.serviceModelSnapshot` | **chưa có field** | N3 |

Theo `v6-admin-rebuild` §4.12.4, câu hỏi canonical là:

> Tại thời điểm NLD đạt milestone thành công, User nào có Handling Assignment hợp lệ và được
> policy/case resolution công nhận là beneficiary?

Cả hai vế (`HandlingAssignment`, `beneficiary`) đều chưa có bảng. `referrerUserId`,
`currentAssigneeUserId`, `beneficiaryUserId` là **ba semantic khác nhau** và không được nhập làm một (§4.12.4).

### 9.2 Vấn đề dữ liệu độc lập cần quyết định (D-3)

`CommissionLedger` tham chiếu người và việc bằng **chuỗi trần, không có `@relation`**:

```
CommissionLedger.ctvId         schema.prisma:1230   String   — KHÔNG @relation
                 .workerId     :1231                String?  — KHÔNG @relation
                 .assignmentId :1232                String?  — KHÔNG @relation
                 (chỉ policy, reversalOf, reversals là relation thật)
CommissionDebt.ctvId           :1266                String   — KHÔNG @relation
CtvWithdrawalRequest.ctvId     :1285                String   — KHÔNG @relation
```

Trong khi đó `CandidateSubmission.ctv` (`:565`) và `SourceClaim.ctv` (`:624`) **lại có** `User? @relation`.
⇒ Nguồn giới thiệu thì liên kết được, bản ghi tiền thì không. Không thể traverse
`ledger → người hưởng → worker → assignment → project` bằng Prisma.

Hai phương án:

- **(a) Join tay ở read service** — không migration, đủ để sửa `AD3` ngay trong W1. Rủi ro: orphan `ctvId`
  không bị ràng buộc, vẫn không có integrity.
- **(b) Thêm `@relation` + FK** — cần migration, đụng `schema.prisma` ⇒ phải xếp vào lane N2 (một owner
  schema duy nhất), **không** làm trong W1.

### 9.2.1 QUYẾT ĐỊNH (D-3) — làm (a) ngay trong W1, đưa (b) vào N2

Đã đo hai điều kiện quyết định:

| Phép đo | Kết quả | Hệ quả cho phương án (a) |
|---|---|---|
| `users` có nằm trong tập FORCE RLS không? | **KHÔNG** (37 bảng FORCE RLS liệt kê từ migration; `users` vắng mặt) | Join `ctvId → User.fullName` **không bị RLS làm rỗng** ⇒ tên hiển thị được đáng tin |
| `workers` có FORCE RLS không? | **CÓ** (`20260816210000_s1_rls_worker`, `20260827160000_m1_07b…`) | Join `workerId → Worker.fullName` **có thể bị che** ⇒ phải xử lý tường minh |
| `commission_ledger` có FORCE RLS không? | **CÓ** (`20260819104700_p2_commission_rls`) | Caller vốn chỉ thấy ledger row trong scope của mình ⇒ join tên cho **chính những row đó** không mở rộng data scope |

⇒ Quyết định cụ thể cho W1/`AD3`:

1. Tên CTV: query `User` thứ hai **trong cùng `withDbContext`**, chỉ lấy `fullName` cho tập `ctvId` đã có
   trong row caller được phép thấy. Không dùng `$transaction` trần (bài học `hrp-public-read-rls-dead`).
2. Tên Worker: vì `workers` FORCE RLS, khi lookup trả rỗng **phải render nhãn chữ "Không có quyền xem"**,
   **không** để ô trống và **không** fallback về `slice(-8)`. Ô trống là trạng thái nói dối (`v6-admin-rebuild`
   §8 nguyên tắc 3).
3. **Cấm** denormalize `beneficiaryDisplayName` vào `CommissionLedger` — đó là scalar shortcut, vi phạm
   `TIER0_HANDOVER` §2.3.
4. **Không** thêm `@relation`/FK trong W1. Lý do: đây là hệ thống đang sống, `CommissionLedger` là bảng
   append-only chở tiền (`BigInt`, có `reversalOf`), và một `ALTER TABLE … ADD CONSTRAINT FOREIGN KEY`
   sẽ **fail cứng nếu tồn tại `ctvId` mồ côi**. Phải đi đúng chuỗi `TIER0_HANDOVER` §2.2:
   `ADD → AUDIT CURRENT DATA → ADOPT → BACKFILL → … → ENFORCE`.
5. Việc đưa vào **N2**: (i) audit đếm `ctvId`/`workerId`/`assignmentId` mồ côi trên live; (ii) thêm FK
   relation cùng lúc với `CommissionBeneficiaryDecision` — vì lúc đó semantic "người hưởng" mới chính thức
   tách khỏi "CTV".

**Vì sao không chọn (b) ngay:** (b) cho integrity tốt hơn nhưng đụng `schema.prisma` (phá ràng buộc một
owner schema), cần migration trên bảng chở tiền, và **chưa giải quyết được vấn đề hiển thị** — kể cả có FK,
trang ledger vẫn phải join để ra tên. (a) cho giá trị Owner thấy ngay với rủi ro bằng 0; (b) là việc của
N2 khi beneficiary trở thành entity thật.

### 9.3 Việc W5 được phép làm bây giờ

Chỉ **lập kế hoạch**, không code: đọc `docs/V7/V7_2_TALENT_WORKBENCH_BACKLOG.md`
(V72-006 PlacementCase 360 read service, V72-007 detail UI, V72-020 HandlingAssignment schema,
V72-022 AFF_INITIAL 7 ngày, V72-028 Company Pool query, V72-035 Recruiter Workbench) và đối chiếu
`TIER0_HANDOVER` §5 N2/N3. Chờ Owner chốt **AFF clock policy** (`TIER0_HANDOVER` §8.1: calendar days hay
business days, timezone, holiday calendar) — đây là prerequisite của N2, không phải của UI.

---

## 10. W6 — CI, gate và lane integration

| ID | Vấn đề | Bằng chứng | Việc |
|---|---|---|---|
| `W6.1` | Lane integration thiếu `DATABASE_URL_TEST` | `.env.example` chỉ có `DATABASE_URL=`; `scripts/ci/integration-preflight.mjs:73` đọc `process.env.DATABASE_URL_TEST`, `:7` *"NEVER falls back to the repo .env"*, `:83-85` còn **chủ động chặn** fallback sang `DATABASE_URL` / `DATABASE_URL_DEV` | **ĐÃ ĐÓNG — xem §10.1.** Round-5 chạy thật 9/9 trên `hrp_mp2_test`. Giữ quy trình: biến môi trường cấp máy + branch gate mỗi lần chạy |
| `W6.2` | `npm test` là lane **không an toàn** | `package.json`: `"test": "vitest run"` — bare, đọc `DATABASE_URL` production. **Đã đo: không ai gọi nó** — `.github/workflows/ci.yml:54` dùng `npm run test:unit`, `:86` dùng `npm run test:integration`; gate `verify-audit.ps1:285` (`S-11`) vốn đã FAIL nếu evidence dùng `npx vitest run` trần | **ĐÃ CHỐT (D-5):** đổi `"test"` → `vitest run --config vitest.unit.config.ts` (alias lane an toàn) và dời lane cũ sang tên tự tố giác `"test:prod-db-unsafe": "vitest run"`. Blast radius = 0 vì không có consumer nào |
| `W6.3` | CI workflow đỏ | Theo `docs/PLANNER_HANDOVER.md`: workflow #146 FAIL từ `8c6fd03` (Node 22 + Prisma 5.22 binary engine mismatch). **Chưa đo lại trong khảo sát này** — W0.3 phải đo lại trước khi kết luận | Tách **hai** blocker riêng ownership theo `TIER0_HANDOVER` §4.4: (i) lint quét archive trong scratch; (ii) integration fail-closed khi thiếu `DATABASE_URL_TEST`. Không trộn vào N-lane |
| `W6.4` | Gate đã khả dụng trở lại | `.ai-pipeline/` = 53 file tracked, đủ `verify-task.ps1`, `verify-handoff.ps1`, `verify-audit.ps1`, `gate-lib.ps1`, `verify-delivery-presence.ps1`, `verify-pipeline.ps1`, `verify-gates.selftest.ps1`. `.ai-pipeline-bak/` là bản sao untracked | **Điều chỉnh so với ghi nhận đầu phiên** (lúc đó 53 file đang bị xóa ở worktree). W0.5 chỉ còn việc dọn bản `-bak`. `CLAUDE.md` trỏ `.ai-pipeline/README.md` + rules + role file ⇒ **đúng lại rồi**, không cần sửa |

### 10.1 D-2 — DB test đã xác minh: DÙNG ĐƯỢC, và round-5 đã dùng thật (rev 3)

Owner cấp `C:\cre_hrp.txt` **ngoài repo**. Tier 1 probe **chỉ đọc catalog** (secret không đi qua text
lệnh), kết quả 13 phép đo xem Phụ lục A. Owner sau đó xác nhận (D-2b, 14/09): cả 2 URL trỏ cùng một endpoint, thuộc branch **`hrp_mp2_test`**,
non-primary — Neon control plane đã xác minh tại `probe-20260913.clean.ndjson:3` (`same_branch=true`,
`branch_name_match=true`). Ánh xạ chi tiết (endpoint ID, branch ID) đã ghi vào
`docs/PLANNER_HANDOVER.md` §9 — plan này chỉ trỏ tới đó, không lặp lại identifier.

**Round-5 là bằng chứng độc lập thứ hai:** stream song song chạy integration N1 **9/9 PASS** trên chính
branch này, cộng lane 18 file 361 pass + 2 skip và unit 2173/2173 PASS. `BLK-01` **đóng hoàn toàn** —
không còn AC nào ở trạng thái `ENV_BLOCKED` vì thiếu DB test.

**Quy trình giữ lại cho mọi lần chạy sau (không đưa secret vào repo):**

- `integration-preflight.mjs` **không load dotenv** — đọc thẳng `process.env` ⇒ đặt `DATABASE_URL_TEST`
  ở **biến môi trường cấp máy (user scope)**.
- Dùng URL role **`app_user_writer`**, **không** dùng `neondb_owner`.
- Mỗi lần chạy ghi vẫn chạy branch gate lại (`neon_branch_gate.ps1` + `EXPECTED_BRANCH_NAME=hrp_mp2_test`);
  không dùng ánh xạ §9 để bỏ gate.

---

## 11. Thứ tự đề xuất

```
W0  docs-state   (W0.1 gate cuối N1 + W0.2 hòa 1 dòng mock + W0.3 rà 21 Status + W0.4 PLANNER
   ~0.5–1 ngày    YAML trùng key + W0.5 -bak + W0.6 roadmap + W0.7 gitignore + W0.8 package.json)
                              │
                              ▼
W1  admin-truth-defects   (AD1..AD5)        ~2–3 ngày   không schema   ← chạy song song N-lane được (D-1)
                              │
                              ▼
W2  admin-detail-foundation                 ~3 ngày     không schema   ← điều kiện cần
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
W3  admin-demand-tree                 W4  admin-labor-profile-workbench
    (Cây A) ~4–5 ngày                     (Cây B) ~5–6 ngày
    không schema                          không schema, cần read API mới
              └───────────────┬───────────────┘
                              ▼
                   ═══ N2 GATE (Owner) ═══
                   ReferralAttribution + HandlingAssignment
                   + CommissionBeneficiaryDecision (+ FK cho CommissionLedger)
                              │
                              ▼
W5  beneficiary / handling / Company Pool UI   — chỉ sau khi N2 land
                              │
                              ▼
                   ═══ N3 GATE ═══  ServiceModel + Placement
                              │
                              ▼
                   N4 actual-start bridge → N5 → N6 → N7 Compatibility Gate → V7.1
```

**W6 chạy nền**, không nằm trên critical path của UI. `W6.1` **đóng hoàn toàn** (§10.1, round-5 là
bằng chứng độc lập thứ hai) ⇒ không còn AC nào `ENV_BLOCKED` vì thiếu DB test.

### Vì sao thứ tự này (rev 3)

- **W0 trước**: worktree này đang lạc 2 commit sau `origin/main` và còn 1 dòng mock chưa hòa (§2.1) —
  không dọn thì mọi TASK mới đều viết trên nền sai. `W0.1` chờ gate cuối của N1 (Tier 0/Owner verify
  deploy), `W0.2`–`W0.8` làm được ngay.

- **W0 trước**: không có trạng thái đúng thì không ước lượng được gì; và `W0.1` đóng một task đang
  `CONDITIONAL` mà code đã lên production — rủi ro tài liệu lớn hơn rủi ro code.
- **W1 trước W2**: 5 defect là thứ Owner *thấy* mỗi ngày, sửa rẻ, và chứng minh được pattern đọc đúng
  trước khi nhân bản ra 3 cây chi tiết.
- **W2 trước W3/W4**: dựng breadcrumb + `RelatedObjects` một lần, dùng ba lần. Làm ngược lại sẽ sinh ba
  bộ detail page khác nhau.
- **W3 song song W4 được** — D-1 đã nới: UI thuần không schema được chạy song song N-lane. Nhưng W3 và W4
  **vẫn nên nối tiếp nhau** vì cả hai đều dựng trên W2 và sẽ tranh nhau `app/admin/**` + component nền.
  Song song chỉ nên dùng cho **W1/W2 vs N-lane**, không phải W3 vs W4.
- **W5 không thể kéo sớm**: đây là giới hạn dữ liệu, không phải giới hạn công sức.

---

## 12. Quyết định — ĐÃ CHỐT 14/09 (Owner trả lời, Tier 1 phân tích D-3..D-6)

| ID | Câu hỏi | Quyết định | Căn cứ đo được |
|---|---|---|---|
| **D-1** | Có cho mở stream UI thứ hai song song N-lane không? | ✅ **CHO PHÉP.** W1/W2 (và W3/W4 về nguyên tắc) chạy song song N-lane. **Vẫn một stream** cho mọi việc đụng `schema.prisma`, migration, hoặc `src/domains/talent/**` | `TIER0_HANDOVER` §6: *"UI/CMS thuần có thể tiến cùng N0/N1. Không để hai stream cùng sửa schema/migration"* |
| **D-2** | Cấp `DATABASE_URL_TEST`? | ✅ **ĐÃ CẤP, ĐÃ XÁC MINH, ĐÃ DÙNG THẬT.** Endpoint trong file cấp ngoài repo → branch `hrp_mp2_test`, non-primary (Neon control plane xác minh tại `probe-20260913.clean.ndjson:3`; identifier chi tiết ở `PLANNER_HANDOVER.md` §9). Round-5 là bằng chứng độc lập thứ hai (9/9 PASS). Xem §10.1 | Commit message `55f4180` + `AUDIT.md` round-5 + §10.1 |
| **D-3** | `CommissionLedger` thiếu FK: join tay (a) hay thêm `@relation` + migration (b)? | ✅ **(a) NGAY TRONG W1, (b) ĐƯA VÀO N2.** Phân tích đầy đủ ở §9.2.1 | `users` **không** FORCE RLS ⇒ join tên CTV tin cậy được; `workers` **có** FORCE RLS ⇒ phải render nhãn "Không có quyền xem" thay vì ô trống; `commission_ledger` FORCE RLS ⇒ join không mở rộng data scope. FK ngay sẽ fail cứng nếu có `ctvId` mồ côi và vi phạm chuỗi §2.2 |
| **D-4** | 5 trang mồ côi: đưa vào nav hay ẩn có chủ đích? | ✅ **ĐƯA VÀO NAV, nhóm theo quy trình** (Nhu cầu & Tuyển / Con người / Tài chính / Hệ thống), không nối dài danh sách phẳng 13 mục. `AD3` phải land **trước hoặc cùng** `AD1` | Đã đo: cả 5 trang đều functional — `users` 120 dòng, `vendors` 209, `commission/policies` 274, `commission/ledger` 239 (1 write call), `jobs/job-postings` 308; **0** marker `TODO`/`FIXME`/`Đang phát triển` ⇒ ẩn đi là lãng phí việc đã làm |
| **D-5** | `npm test` (bare `vitest run`, đọc `DATABASE_URL` production): đổi tên, bỏ, hay giữ? | ✅ **ĐỔI.** `"test": "vitest run --config vitest.unit.config.ts"` (lệnh quy ước thành lane an toàn) và dời lane cũ sang `"test:prod-db-unsafe": "vitest run"` để tên tự tố giác | Đã đo: **không có consumer nào** — `ci.yml:54` dùng `test:unit`, `ci.yml:86` dùng `test:integration`; gate `verify-audit.ps1:285` (`S-11`) vốn đã FAIL evidence dùng `npx vitest run` trần ⇒ blast radius = 0, chỉ còn chặn lỗi người |
| **D-6** | 4 file rác root + `.ai-pipeline-bak/`: xóa hay giữ? | ✅ **GITIGNORE, KHÔNG XÓA.** Thêm `/temp*.txt` và `/orca*.bat` vào `.gitignore`. `.ai-pipeline-bak/` **không cần làm gì** | Đã đo: `.ai-pipeline-bak` **đã được che** bởi `.git/info/exclude:7` ⇒ không có rủi ro commit, và đó là backup Owner chủ đích tạo — xóa là vượt quyền. `temp.txt` (58 dòng) và `temp3.txt` (6 dòng) chỉ là **output `Get-ChildItem`** của `docs/tasks` — regenerable, 0 secret hit; nhưng `orca.bat` (`@echo off` / `exit 0`) và `orca-status.bat` (`exit 0`) là **shim no-op có thể đang đỡ cho một tool nào đó** ⇒ giữ, chỉ gitignore. `git check-ignore` xác nhận `temp.txt` và `orca.bat` **chưa được che** — đó mới là rủi ro thật |

### 12.1 Việc kế tiếp, theo thứ tự (rev 3)

| # | Việc | Ai | Chặn bởi |
|---|---|---|---|
| 1 | **Gate cuối N1:** Tier 0/Owner verify Vercel đã rebuild từ `55f4180` + smoke admin intake bằng tài khoản ADMIN thật (`POST /api/admin/intake/staff` → 201 + verdict) → ghi nhận N1 ACCEPTED | **Tier 0 / Owner** (Tier 1 không có tài khoản ADMIN prod) | — |
| 2 | Hòa 1 dòng mock `$executeRawUnsafe` (§2.1) + dời `evidence/neon_branch_gate.r4.stdout.txt` từ root về đúng thư mục evidence của task — gộp vào TASK W0 | Tier 1 | không — làm được ngay |
| 3 | Phát hành TASK `hrp-v6-docs-state-reconciliation` (W0: `W0.1`–`W0.8`) | Tier 1 | (2) nên đi cùng để worktree sạch trước |
| 4 | Phát hành TASK `hrp-v6-admin-truth-defects` (W1: `AD1`–`AD5`) — chạy song song N-lane theo D-1 | Tier 1 | không (cấm chạm `src/domains/talent/**` tới khi hòa xong) |
| 5 | Phát hành TASK `hrp-v6-admin-detail-foundation` (W2) | Tier 1 | W1 nên xong trước để có pattern đọc đúng |
| 6 | Quyết định có viết TASK N3 `hrp-v6-n3-service-model-placement` không — cursor local đã trỏ vào `TASK.md` **chưa tồn tại**; không viết hợp đồng mới cho tới khi N1 ACCEPTED và Tier 0 duyệt decomposition N1→N3 | Tier 1 + Tier 0 | (1) |
| 7 | Credential rotate — Owner đã quyết **hoãn tới sau deploy production** (§1.3). Không phải việc chặn | Owner, đúng checkpoint | deploy production |

Tier 1 **chưa phát hành TASK nào** và **chưa commit** gì — tài liệu này đang untracked, chờ Owner duyệt.
Worktree này cũng **chưa fetch-merge** `origin/main` (lạc 2 commit, §2.1) — hòa xong mới mở TASK mới trên
nền đúng.

---

## 13. Định nghĩa hoàn thành của plan này

1. Không còn task nào có `Status` sai với code đã land (W0).
2. Mở `/admin` thấy ngay **quy trình**, không phải danh sách module; mọi trang tồn tại đều vào được (W1, D-4).
3. Từ một Client đi được tới Project → JobOpening → NLD đang làm ở đó **bằng link thật**, có breadcrumb,
   URL ổn định, không modal nhiều tầng (W2, W3).
4. Từ một người lao động đi được tới Application, Episode, Assignment theo Job → Project → Công ty (W4).
5. Không còn chỗ nào trong admin hiển thị ID thô thay cho tên người, hoặc lọc/hiển thị trên field không
   tồn tại (W1 `AD2`, `AD3`).
6. Mọi con số trên màn hình đều có dữ liệu thật chống lưng; chỗ chưa có dữ liệu thì nói rõ
   "Chưa có dữ liệu", không suy diễn (`v6-admin-rebuild` §8 nguyên tắc 2).
7. Phần ref / handling / beneficiary được **lên lịch đúng chỗ** (N2) thay vì bị dựng giả trên UI.

---

## 14. Plan này KHÔNG làm (chống scope creep)

- Không phát hành `TASK.md` nào — 6 quyết định đã chốt (§12) nhưng thứ tự thực thi vẫn chờ Owner duyệt.
  Riêng N3: cursor local đã trỏ vào `TASK.md` chưa tồn tại — không viết hợp đồng N3 cho tới khi N1
  ACCEPTED và Tier 0 duyệt decomposition (§12.1 mục 6).
- Không tự xóa file của Owner. D-6 chọn `.gitignore` (reversible) thay vì xóa.
- Không tự rotate credential, không tự gọi Neon API bằng key của Owner (§1.1) — hai việc đó cần Owner.
- Không sửa `prisma/schema.prisma`, không sinh migration.
- Không chạm `src/domains/talent/**` cho tới khi hòa xong 1 dòng mock với `origin/main` và N1 sang
  `ACCEPTED` (§2.1).
- Không mở lại các task đã `ACCEPTED` / đã đóng hẳn.
- Không tự phát hành verdict Tier 3; không tự commit/push.
- Không đụng Attendance / Reconciliation / Reflection–Advance / Payroll — Owner đã chốt giữ
  "Đang phát triển"; Payroll làm cuối vì Owner có app lương riêng.
- Không dựng `Application` model mới chỉ để đổi tên `CandidateSubmission` (`TIER0_HANDOVER` §11).
- Không thêm scalar shortcut làm nguồn sự thật (`isWorking`, `availability`, `currentCompanyId`,
  `handlerId`, `ownerId`, `poolStatus`) — giá trị hiện tại phải là projection rebuild được từ lịch sử.

---

## Phụ lục A — Số đo gốc

Rev 2 đo trên `50dedee` (worktree local lúc đó). Rev 3 đo lại trên `origin/main` = `40cd9d4`; các dòng
đánh dấu *(rev 3)* là giá trị mới, các dòng còn lại giữ nguyên (W1–W5 chưa có commit mới nào đụng tới).

| Phép đo | Kết quả | Lệnh / nguồn |
|---|---|---|
| `origin/main` *(rev 3)* | `40cd9d4` (`50dedee` + `55f4180` N1 round-5 + `40cd9d4` docs) | `git log --oneline 50dedee..origin/main` |
| Worktree local *(rev 3)* | ở `50dedee`, **lạc 2 commit**, WIP chưa hòa (§2.1) | `git status --porcelain`; `git diff origin/main --stat` |

| Phép đo | Kết quả | Lệnh / nguồn |
|---|---|---|
| Dynamic route dưới `app/admin` | 1 (`jobs/job-postings/[id]`) | `Get-ChildItem -Recurse -Directory app/admin \| ? Name -match '^\['` |
| Số trang admin | 19 | `Get-ChildItem -Recurse -File app/admin -Filter page.tsx` |
| `'use client'` + fetch, 0 server import | 13 | grep `'use client'` / `fetch(` / `from '@/src/...'` từng page |
| Link chéo `/admin/...` trong admin | 7 (tất cả trong cụm `jobs`) | grep `href=` trỏ `/admin/` trên `app/admin/**/*.tsx` |
| Mục trong `ADMIN_NAV_PHASE4` | 13 phẳng | `role-guard-layout.tsx:110-125` |
| Hit `LaborProfile` \| `PlacementCase` trong `app/admin` | **0** | grep toàn bộ `app/admin/**/*.tsx` |
| Route `[id]` chỉ có PUT, không GET | `clients`, `projects`, `workers`, `vendors` | grep `^export (async )?function (GET\|POST\|PATCH\|PUT\|DELETE)` |
| Census method toàn `app/api` (80 route) | GET 47, POST 45, PATCH 4, PUT 4, DELETE 2 | như trên |
| `CommissionLedger` relation thật | 3 (`policy`, `reversalOf`, `reversals`) — `ctvId`/`workerId`/`assignmentId` là `String` trần | `schema.prisma:1228-1257` |
| `.ai-pipeline` tracked / `-bak` tracked | 53 / 0 | `git ls-files` |
| `DATABASE_URL_TEST` trong `.env.example` | **không có** | grep `DATABASE_URL` |
| Working tree tại thời điểm đo | 2 ` M` (`placement-case.service.ts` +26/−4, test +14/−2) + 4 `??` root | `git status --porcelain` |
| HEAD đã push | `50dedee` là ancestor của `origin/main` | `git merge-base --is-ancestor HEAD origin/main` |
| N1 intake-writer tại `origin/main` *(rev 3)* | TASK `v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5`; HANDOFF round 5; AUDIT Tier 3 LIGHT round-5 PASS; integration N1 9/9 PASS (`hrp_mp2_test`); unit 2173/2173; lane 18 file 361+2 | `git show origin/main:docs/tasks/hrp-v6-n1-intake-writer/{TASK,HANDOFF,AUDIT}.md`; commit message `55f4180` |
| `evidence/` ở repo root *(rev 3)* | `evidence/neon_branch_gate.r4.stdout.txt` — UTF-16 BOM, 1040 bytes, tracked trong `55f4180`, ngoài mọi evidence convention | `git ls-tree -r origin/main --name-only \| grep ^evidence/`; `od -c` 8 dòng đầu |
| `/api/jobs/apply` sau `50dedee` | 37 dòng, stub 410 (`retiredApplyEndpointResponse`) — **lỗ hổng ghi ẩn danh role proxy `HR_STAFF` của `284785a` đã đóng trên production** | `git show --stat 50dedee`; đọc file |
| N3 `hrp-v6-n3-service-model-placement` *(rev 3)* | **chưa tồn tại** — không có dir, không có commit nào trên `--all` chạm slug này. Cursor `PLANNER_HANDOVER.md` (local, `40cd9d4`-based + WIP) đã trỏ `task_path` vào `TASK.md` của nó ở trạng thái DRAFT, nhưng file chưa được tạo | `ls docs/tasks/ \| grep n3` (rỗng); `git log --oneline --all -- docs/tasks/hrp-v6-n3-service-model-placement/` (rỗng) |

## Phụ lục B — 21 task có `Status` chưa terminal (W0.3 phải phân loại)

| Task | Spec | Status đo được |
|---|---|---|
| `hrp-ui-refactor-viec-lam-and-best-jobs-2026-09-11` | `v1.0` | `READY_FOR_REVIEW` |
| `hrp-v6-credential-rotation-posture` | `v1.2` | `READY_FOR_EXECUTION` |
| `hrp-v6-n1-intake-writer` | `v0.1 DRAFT` → *(rev 3)* **`v0.5 ROUND_5_DELIVERED` / `READY_FOR_AUDIT_ROUND_5`**, Tier 3 LIGHT round-5 **PASS** — **sắp ACCEPTED, còn gate cuối** (Tier 0/Owner verify Vercel deploy) |
| `hrp-v6-n1-placement-case-foundation` | `v1.2` | `READY_FOR_EXECUTION` |
| `hrp-v6-p1-job-opening-posting-split` | `v1.2` | `RESOLVING_R2` |
| `hrp-v6-ui-02-homepage-demo-recomposition` | `v1.8` | `READY_FOR_EXECUTION` (Tier 3 FAIL round 4) |
| `hrp-v6-ui-03-homepage-huongb-visual-parity` | `v1.5` | `READY_FOR_EXECUTION` (`BLK-03` → 36 test fail) |
| `hrp-v6-ui-04b-vis-correction-r1` | `v1.0` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r3-footer-text-hotfix` | `v0.1 DRAFT` | `DRAFT` |
| `hrp-v6-ui-04c1-r4-footer-justify` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r5-footer-spacing-fix` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r6-footer-flatten-cot-1` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r7-bỏ-helper-text-disabled` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04c1-r9-footer-map-osm` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04d-pre-existing-13-fail-resolve-2026-09-11` | `v1.0` | `READY_FOR_REVIEW` → commit `fe54903` |
| `hrp-v6-ui-04d-section-render` | `v1.7` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04e-hero-width-balance` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04f-card-monogram-abbrev` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04g-recruitment-highlight-carousel` | `v0.1` | `READY_FOR_EXECUTION` |
| `hrp-v6-ui-04h-width-uniform` | `v0.1` | `READY_FOR_EXECUTION` |

Bảy task dir không có dòng `| Status |` theo mẫu bảng (W0.3 phải kiểm tra định dạng, chưa kết luận được):
`hrp-v6-admin-overview-dashboard`, `hrp-v6-admin-staffing-list-pagination`,
`hrp-v6-admin-v2-jobposting-editor-shell`, `hrp-v6-admin-v4-media-library`,
`hrp-v6-admin-v6-av1-settings-editor`, `hrp-v6-n0-contract-audit`,
`hrp-v6-project-company-name-projection-consistency`.

> **Nghi ngờ chính của Tier 1:** phần lớn nhóm `ui-04c1-r4..r9`, `04e`, `04f`, `04g`, `04h` và
> `n1-placement-case-foundation` là **`DONE-STALL`** (code đã land, Status chưa cập nhật) — vì footer
> UI04 r4 từng là HEAD của `main`. W0.3 phải **đo bằng `git log -S`** cho từng task thay vì tin lời văn,
> theo đúng bài học "đo trên baseline, không phải worktree".
