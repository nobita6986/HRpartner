# TIER 1 LIVING HANDOFF v2.3 — HRP V5/V6

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-08 09:15 Asia/Bangkok
roadmap_source: docs/V6/v6-roadmap.html; docs/V6/v6-admin-rebuild_ROADMAP.md; docs/UNIFIED_PLAN_v5.md chi con la nguon cho V5/go-live debt
PHASE_MAP: |
  Phase 7: Post-Launch Debt (hien tai)
    -> GO-LIVE-20 public listing ACCEPTED v1.6
    -> TEST-01 browser lane ACCEPTED v1.5
    -> GO-LIVE-21 credential hygiene CLOSED v1.5; phan OP con lai nam ngoai repository task
    -> Security credential rotation ACCEPTED v1.3 theo Planner Resolution va audit round 7
    -> GO-LIVE-07 marketplace launch proof DONG GO_LIVE_BLOCKED v1.6 ngay 08/09 (Tier 3 audit round 3 BLOCKED 1/7/12; AUD-001/002 P1 OPEN khong the giai quyet tai task nay)
    -> hrp-v6-credential-rotation-posture READY_FOR_EXECUTION v1.2 — Tier 1 sua 5 loi R1 BLOCKED ngay 08/09 09:05: EV-03 baseline sai (3 file UNTRACKED chu khong phai tracked); EV-04 sai (seed.mjs da sach tu go-live-21 v1.5); AC-05 khong kha thi (bcrypt=3 khong the <=2); RQ-06 vi pham R-01 (Tier 2 doc credential production cu); scope thieu scripts/auth/*; secret manager = .env.runtime chmod 600 (Tier 2 KHONG doc credential that); .gitignore bo sung .env.dev/.env.preview/.env.prod.test
    -> GO-LIVE-19 PII DB mask DRAFT, cho TEST DB + migration window
  Phase 8: V6 Admin Rebuild
    -> hrp-v6-p1-labor-profile-schema ACCEPTED v1.1 (a4ab9f0)
    -> hrp-v6-p1-job-opening-posting-split ACCEPTED v1.1 (cf887c0)
    -> hrp-v6-p1c-new-ui-restyling READY_FOR_EXECUTION v1.2 — Tier 1 sua provenance bug R3 BLOCKED ngay 08/09 08:35: adopt blob f52a2b4 (36320 B) tu detached a489da8 vao main tai commit 3e6131b (pure plumbing git commit-tree de giu blob nguyen CRLF); baseline neo main @ 3e6131b; EV-01/EV-02 ref HEAD that; Q-01..Q-04 da RESOLVED tu R2
    -> V6 Phase 2/3/4/5 chi mo theo roadmap va decision gate tuong ung
  Phase 9+: AFF -> M7/M8 -> M6 policy/slices -> PAY theo authority ben duoi
current_lane: Phase 8 V6 Phase 1 (1C + credential-rotation ACCEPTED) — Tier 2 running 1A R1
current_task: hrp-v6-p1-job-opening-posting-split — Tier 2 RUNNING R1
task_path: docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md (Tier 2 RUNNING R1); docs/tasks/hrp-v6-p1-labor-profile-schema/TASK.md (READY, cho sau 1A); docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/TASK.md (DEFERRED — Owner defer to end of V6 Phase 1 dev cycle); docs/tasks/hrp-v6-p1c-new-ui-restyling/TASK.md (ACCEPTED v1.2); docs/tasks/hrp-v6-credential-rotation-posture/TASK.md (ACCEPTED v1.3)
spec_version: 1A v1.2 RESOLVING_R2; 1B v1.0 READY; gl-07 v1.6 DEFERRED; 1C v1.2 BLOCKED; 1D v1.0 READY; credential-rotation v1.3 ACCEPTED
task_status: 1A v1.2 RESOLVING_R2 — AUD-001..AUD-006 Planner Resolution xong, schema/migration/migrationRLS fixed; 1B READY (baseline 4758809, same prisma/schema.prisma); 1C BLOCKED (R1 done, R2 semantic preflight blocked + Q-02 brand voice); 1D v1.0 READY (baseline HEAD); gl-07 DEFERRED; credential-rotation v1.3 ACCEPTED
task_path: docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md (v1.2 RESOLVING_R2); docs/tasks/hrp-v6-p1-labor-profile-schema/TASK.md (READY, cho sau 1A); docs/tasks/hrp-v6-p1c-new-ui-restyling/TASK.md (BLOCKED R2); docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md (READY v1.0, cho sau 1B); docs/tasks/hrp-v5-go-live-07-marketplace-launch-proof/TASK.md (DEFERRED); docs/tasks/hrp-v6-credential-rotation-posture/TASK.md (ACCEPTED v1.3)
current_gate: TIER_3_AUDIT_R2 (1A v1.2 — AUD-001..AUD-006 resolved)
next_action: Tier 3 audit R2 cho 1A; 1B cho 1A commit roi chay noi tiep; 1C blocked R2 — cho 1A/1B xong roi xu ly.
approval_sequence: 1A: HANDOFF -> Tier 3 R1 -> Tier 1 ACCEPT; 1B: HANDOFF -> Tier 3 R1 -> Tier 1 ACCEPT
previous_closed: 1C v1.2 ACCEPTED 08/09 09:42 (11/11 AC, 0 P1/P2); credential-rotation v1.3 ACCEPTED 08/09 09:18 (10/10 AC, 0 P1, 2 P2, 1 P3); GO-LIVE-20 ACCEPTED v1.6; TEST-01 ACCEPTED v1.5; GO-LIVE-21 CLOSED v1.5; GO-LIVE-07 DONG GO_LIVE_BLOCKED v1.6
v6_foundation: hrp-v6-p1-labor-profile-schema ACCEPTED v1.1 (a4ab9f0); hrp-v6-p1-job-opening-posting-split ACCEPTED v1.1 (audit d690693, planner acceptance cf887c0); hrp-v6-p1c-new-ui-restyling READY v1.2 (Tier 1 fix contract 08/09 00:00 + resolve Q 08/09 00:40 + adopt artifact 08/09 08:35); hrp-v6-credential-rotation-posture READY v1.2 (Tier 1 tu quyet Q 08/09 00:30 + sua 5 loi R1 08/09 09:05)
held_draft: hrp-v5-go-live-19-tracking-pii-db-mask — can TEST DB + migration window
metadata_drift: hrp-v6-security-credential-rotation, hrp-v6-p1-labor-profile-schema va hrp-v6-p1-job-opening-posting-split co control header cu READY/v1.0-v1.1 trong khi Planner Resolution + Revision Log ghi ACCEPTED; khong sua ngam accepted contract, can mot dot reconciliation rieng
queue_authority: Chi tiet V6 o docs/V6/v6-admin-rebuild_ROADMAP.md va docs/V6/aff_plan.md; dung dung task slug that, khong suy dien them phase/task; khong co hai migration stream cung sua prisma/schema.prisma
owner_boundary: GO-LIVE-07 da DONG GO_LIVE_BLOCKED; credential-rotation Tier 1 da tu quyet 5 Q theo default an toan va sua 5 loi R1 BLOCKED; 1C Tier 1 da tu quyet 4 Q theo default an toan va sua provenance; Tier 2 credential-rotation KHONG duoc doc/rotate credential production that (R-01 iron rule); Owner override tu o gui ngan neu can
protected_paths: README.md va docs/tasks/hrp-v6-p1-labor-profile-schema/PROMPT_TIER2.md thuoc luong khac; khong edit/stage/commit
security_note: Khong lap lai credential lich su; moi gia tri nhay cam chi duoc ghi `[REDACTED]`. Tier 2 credential-rotation KHONG duoc rotate production; rotation thuoc OP Owner theo v5-go-live-21 state order
```

<!-- ROADMAP_CURSOR_END -->

## 0A. ROADMAP_CURSOR archive — snapshot 2026-09-06, chỉ để truy vết

<!-- ROADMAP_CURSOR_ARCHIVE_START -->

```yaml
updated_at: 2026-09-06 09:45 Asia/Bangkok
roadmap_source: docs/V6/v6-roadmap.html (lo trinh hop nhat new-ui + AFF + V6 Admin). docs/UNIFIED_PLAN_v5.md chi con hieu luc cho phan du no lane go-live.
current_lane: Lane new-ui MO. Lo ba gate 01/02/03 deu ACCEPTED `v1.3` va da commit+push `b68d25b` len main, nen bo gate het noi va moi cau PASS tu nay do duoc bang ban o HEAD. Phase 1 cua lo trinh V6 hop nhat la new-ui trang chu; da do va CHOT phase nay chi co MOT hop dong (PLN-65), khong co ui-02/ui-03. Sep chuan thuan 05/09 mo them mot lane NGOAI phase new-ui: trang danh sach that o `/viec-lam` (Phase 1B tren roadmap), hop dong `hrp-v5-go-live-20-public-job-listing-index`.
current_task: hrp-v5-go-live-20-public-job-listing-index -- `v1.5` `READY_FOR_EXECUTION` voi HANDOFF `READY_FOR_AUDIT` round 1, gate ke tiep la TIER_3_AUDIT. Day la mon Tier 1 TU CODE theo chi thi cua sep ngay 05/09 (Iron Rule 1 duoc sep mien cho luot nay), chay trong worktree rieng `C:\CodeApp\HrP\.claude\worktrees\gl20` nhanh `worktree-gl20` de tach index khoi ui-01. Ban giao CHUA commit: 63 path chi ton tai trong INDEX cua worktree ay. Baseline neo vao `b68d25b`. Mon `hrp-v5-ui-01-new-ui-home-integration` VAN MO va khong mat lane, nhung trang thai da DICH XA HON trong luc toi lo go-live-20: luong pipeline song song da chay round 2 -> audit round 1 (verdict CONDITIONAL) -> resolve -> `ACCEPTED` `v1.1`. Do doc lap: BLK-01 dong (ASM-01 gio ghim dung 14 khoa `--text-*` cua DEC-13), 7 dong `--text-` + 82 token `@theme`, lane canonical tren 5 tep hang rao = 146 passed exit 0; diem do duy nhat AC-13 la 2 test cua rf-05, da waive o AUD-001. Viec con lai DUY NHAT DA XONG: commit scoped bang pathspec tuong minh (31 path ui-01 = 5 tep Module + thu muc task; cac path ngoai pham vi giu nguyen trong INDEX) + push len main 06/09 duoi lenh sep "lam a ngay" (push main = deploy production kich hoat qua Vercel Git). Mot he qua cua chinh worktree gl20 phai biet: `BLK-02` cua ui-01 la `63` lint error DEU nam trong `.claude/worktrees/gl20`, tuc worktree cua toi lam o nhiem phep do lint TOAN CUC cua lane khac; ban do lai `npx eslint app src` o cay chinh tra exit `0`.
task_path: docs/tasks/hrp-v5-go-live-20-public-job-listing-index/TASK.md (ban `v1.5` da dong bo hai cay, cung sha256). Lane song song: docs/tasks/hrp-v5-ui-01-new-ui-home-integration/TASK.md
spec_version: go-live-20 `v1.5` READY_FOR_EXECUTION, HANDOFF round 1 da nop, cho audit. Duong bump: `v1.1` (sua AC-19/AC-20) -> `v1.2` -> `v1.5` giua vong, bump cuoi la do CHINH luc code phat hien AC bat kha do; ban `v1.4` co mot cua so DO o `A-05` va `T-03` da dong. ui-01 `v1.1` `ACCEPTED` (exec round `2`, audit round `1` verdict CONDITIONAL; §9 Planner Resolution DA day du, 17/18 AC PASS do doc lap, AC-13 PARTIAL waive tai AUD-001; con lai commit scoped cho sep). gate-01, gate-02, gate-03 = `ACCEPTED` `v1.3`. rf-05 `v1.3` ACCEPTED. rf-06 `v1.0` ACCEPTED. go-live-18 `v1.4` ACCEPTED. go-live-17 `v1.4` ACCEPTED. test-01 `v1.4` can relock truoc khi giao round 3. go-live-07 `v1.5` READY nhung AC-09 va AC-14 phai bump spec truoc (khong mo execution round).
task_status: hrp-v5-go-live-20-public-job-listing-index = `READY_FOR_EXECUTION` `v1.5`, HANDOFF `READY_FOR_AUDIT` round 1, cong ban giao `verify-handoff.ps1` PASS 13 ma kiem exit 0. hrp-v5-ui-01-new-ui-home-integration = `ACCEPTED` `v1.1` (exec round 2, audit round 1 CONDITIONAL), DA commit scoped + push len main 06/09 (deploy production kich hoat qua Vercel), ban giao het treo. hrp-v5-gate-01-audit-row-identity, hrp-v5-gate-02-lane-premise-correction, hrp-v5-gate-03-delivery-vanish-forensics = `ACCEPTED` `v1.3`. hrp-v5-rf-05-tsc-program-boundary = `ACCEPTED` `v1.3`. hrp-v5-rf-06-vitest-default-lane-safety = `ACCEPTED` `v1.0`. hrp-v5-go-live-18-public-surface-hardening = `ACCEPTED` `v1.4`. hrp-v5-go-live-17-rls-required-relation-sweep = `ACCEPTED` `v1.4`. hrp-v5-test-01-browser-lane = `REVISION_REQUIRED` `v1.4`. hrp-v5-go-live-07-marketplace-launch-proof = `READY_FOR_EXECUTION` `v1.5`.
current_gate: TIER_3_AUDIT
next_command: `/audit hrp-v5-go-live-20-public-job-listing-index` -- PHAI chay TRONG worktree `C:\CodeApp\HrP\.claude\worktrees\gl20`. Ban giao chua commit nen o cay chinh KHONG thay mot tep nao cua task nay, va `git show HEAD:<path>` tra rong cho 9 path ma; doc ban trong index bang `git show :<path>` hoac doc thang tep trong worktree, con baseline `b68d25b` thi co trong HEAD. Nguoi viet HANDOFF chinh la Tier 1 phien nay, nen muc 5 khai 17 `LIM-*` trong do sau cai la TU BAC phai duoc audit lai, khong nhan nguyen van; cong xanh khong phai verdict. Hai mon Tier 1 chay song song duoc trong luc cho: MOT -- bump spec go-live-07 AC-09/AC-14 de goi ten lenh that; HAI -- relock test-01 `v1.4` sang round 3 sau khi commit scoped ban giao toolchain rf-05/rf-06. Lane ui-01 DA `ACCEPTED` `v1.1` (round 2 xong, audit round 1 CONDITIONAL) -- KHONG con lenh `/code`; ban giao DA commit scoped bang pathspec tuong minh (5 tep Module + thu muc task) + push len main 06/09 (deploy production kich hoat), het treo; TUYET DOI KHONG mo contract ui-02 hay ui-03 (PLN-65).
audit_lane_parallel: HET NOI. Bo gate da committed+pushed tai `b68d25b` -- `verify-task.ps1`, `gate-lib.ps1`, `verify-handoff.ps1`, `verify-audit.ps1`, `verify-pipeline.ps1` deu co mat o HEAD va worktree = index = HEAD cung mot blob. Ba contract so huu chung da ACCEPTED `v1.3`. Luat cu van giu de phong luot sau: ghi dau tay `git hash-object` cac tep gate TRUOC moi round, va giai ban pre-round bang `git cat-file -p <SHA>` chu khong `git show :<path>` vi cai sau tra index BAY GIO.
previous_accepted: hrp-v5-gate-01/02/03 -- CA BA ACCEPTED 05/09 tren `v1.3`, audit round 1 verdict CONDITIONAL, bon finding P3 deu la loi VAN hoac ngoai pham vi nen duong xu la bump va DEFER chu khong mo execution round. Resolution ghi `PLN-60` toi `PLN-63`. Da commit+push `b68d25b` bang `git commit -- <pathspec>`, 107 tep, LEAK CHECK 0 tren 268 path la. Truoc do -- rf-05 `v1.3`, rf-06 `v1.0`, go-live-17 `v1.4`, go-live-18 `v1.4`.
next_planner_candidate: Ba ung vien, KHONG mon nao thuoc new-ui. MOT -- hai hop dong V6 Phase 1 (`hrp-v6-p1-labor-profile-schema` va `hrp-v6-p1-job-opening-posting-split`) viet duoc NGAY tu 27 hang `Chot` cua `docs/V6/v6-admin-rebuild.md` muc 11. HAI -- relock `hrp-v5-test-01-browser-lane` round 3. BA -- mot contract moi cho `PLN-54`, bang 2 cua `AUDIT.md` bon cot doi lai template nam cot.
blocking_owner: Diem CHO SEP ve push ui-01 DA DONG: sep ra lenh "lam a ngay" 06/09, toi da commit scoped + push len main (deploy production kich hoat qua Vercel Git), ban giao het treo. Diem cho NGUOI cu da dong: quyen giao go-live-20 -- sep chon "cach B" ngay 05/09, tuc Tier 1 tu code trong worktree rieng, va viec da xong. Mot diem cho NGUOI MOI thay vao: ban giao go-live-20 dang song CHI trong index cua `.claude/worktrees/gl20`, chua commit -- de nguyen cho Tier 3 audit tren index, hay commit scoped tu worktree ay bang `git commit -- <pathspec>` truoc khi audit. Toi khong tu quyet vi `R-01` va vi quyen push cua Tier 1 la quyen theo NGU CANH chu khong phai quyen thuong tru; can biet: index-only thi phuc hoi duoc nhung de mat (da tam lan bi cat/mat ban giao), con commit truoc audit thi dua ban chua audit vao lich su nhanh. Va mot cau hoi san pham con mo -- `Q-01`: co CHUYEN o tim kiem ra khoi trang chu hay khong. `v1.0` chon THEM be mat chu khong chuyen, vi hang rao xanh `src/domains/applications/marketplace-inventory.static.test.ts:266` dang ghim UI tim kiem o trang chu; chuyen la lam do mot hang rao dang xanh, nen phai la quyet dinh cua sep chu khong phai cua Tier 1. Mot quyet dinh NGUOI khac van mo va KHONG chan ui-01: `TopCompaniesSection` va `CompanyCard` khong co nguon vi khong bang nao giu ten cong ty cong khai, muon dung thi phai them cot o V6 Phase 1 chu khong phai o mot task reskin. Sua mot claim CU o o nay: khong phai "chi `app/login/login-form.tsx` doc searchParams" -- do lai thi KHONG mot tep `app/**/page.tsx` nao nhan prop `searchParams`, con 22 route API co doc `nextUrl.searchParams` nhung do la tang khac.
 `v1.0` chon THEM be mat chu khong chuyen, vi hang rao xanh `src/domains/applications/marketplace-inventory.static.test.ts:266` dang ghim UI tim kiem o trang chu; chuyen la lam do mot hang rao dang xanh, nen phai la quyet dinh cua sep chu khong phai cua Tier 1. Mot quyet dinh NGUOI khac van mo va KHONG chan ui-01: `TopCompaniesSection` va `CompanyCard` khong co nguon vi khong bang nao giu ten cong ty cong khai, muon dung thi phai them cot o V6 Phase 1 chu khong phai o mot task reskin. Sua mot claim CU o o nay: khong phai "chi `app/login/login-form.tsx` doc searchParams" -- do lai thi KHONG mot tep `app/**/page.tsx` nao nhan prop `searchParams`, con 22 route API co doc `nextUrl.searchParams` nhung do la tang khac.
product_override: /bcc retired; production payroll/payslip belongs to the separate salary app; PAY-01..08 = DEFERRED_FINAL and does not block HRP go-live
cursor_note: Bon ruling moi 05/09. `PLN-64` -- Tier 2 code lien mot mach nhieu task roi audit cuoi phase la HOP LE VE QUY TRINH nhung chi an toan khi cac task DOC LAP file; neu task sau cham lai file task truoc thi truong `Baseline` cua no NOI DOI, vi Tier 2 bi `R-01` cam commit nen SHA baseline khong chua ban giao cua task truoc va moi EV do tren baseline la do tren cay THIEU viec (dung bay so 9, do tren BASELINE khong phai worktree). Duong dung cho chuoi task phu thuoc: Tier 1 commit scoped giua hai task roi neo baseline moi. `PLN-65` -- pham vi mot phase phai do bang KET CAU artifact, khong suy tu ten phase: `new-ui/code.html` co dung 1 the html, 1 the body, 1 the h1, 5 the section va 1 `screen.png`, moi href la `#` tru Navbar tro `/`, va khoi `@theme` dang song da la CHINH bo token Warm Professionalism G27 cung nguon voi `new-ui/DESIGN.md` (`--color-primary` bang `#f26522` o ca hai ben, con `--text-*` dem duoc `0`) -- nen khong ton tai task doi mau cho phan con lai cua be mat cong khai, va phase nay dung o MOT hop dong. `PLN-66` -- trang danh sach `/viec-lam` la mot hop dong RIENG ngoai phase new-ui va no THEM be mat chu khong chuyen: hang rao xanh `marketplace-inventory.static.test.ts:266` ghim UI tim kiem o trang chu nen chuyen di la lam do mot hang rao dang xanh, va rui ro that cua viec them la HAI be mat browse noi hai su that khac nhau, nen `v1.0` buoc chuoi nhan phai giong trang chu tung byte (ke ca `Luong thuong luong`) va cam bo loc luong vi loc sau phan trang se lam `total` noi doi. `PLN-67` -- chay go-live-20 SONG SONG voi ui-01 thi xung dot KHONG nam o file ma nam o PHEP DO: `npm run test:unit`, `npm run typecheck`, `npm run build` la ba phep do TOAN CUC, ca hai hop dong deu lay "toan lane exit 0" lam dieu kien nhan va ca hai deu co cua so DO co y, nen do lane trong luc luong kia dang do la nhan cai do cua nguoi khac. Hai o cua `v1.0` sai va da bump `v1.1`: `AC-20` ket luan tu `git status --porcelain` nen tu FAIL vi `app/globals.css` ban do Tier 2, sua thanh ket luan tren `git diff --cached --name-only` la tap round tu stage; `AC-19` khai xanh bon lane ma khong noi xanh TREN CAY NAO, sua thanh phai chot trang thai cay truoc khi do va cho phep HOAN kem hang `LIM-`. Cua so DO cua `STEP-01` do co lap duoc bang `npm run test:unit -- ` cong duong dan tep test, van la lane canonical vi van qua `vitest.unit.config.ts`. Rui ro con lai chi lo SAU khi ca hai merge va khong phep do nao cua HAI hop dong bat duoc: `AC-14` ghim chuoi nhan theo baseline `b68d25b` trong khi ui-01 dang viet lai phan trinh bay trang chu, giu o `R-06` va `Q-02`. DA DO 06/09 (sau khi ui-01 ACCEPTED+push 3b15bde): ba be mat cho chuoi nhan GIONG NHAU tung byte -- trang chu `/` HEAD (`salaryLabel`/`summaryLabel` inline), `/viec-lam` gl20 (import tu module MOI `src/domains/job-board/public-listing.labels.ts`), va baseline `b68d25b`. ui-01 KHONG cham hai ham nhan (git show `b68d25b:page.tsx` == HEAD tung byte, chi markup xung quanh doi); module cua go-live-20 chep dung tu `b68d25b:85/:101`. `–` en-dash, ` · ` middot, `Luong thuong luong`, ` d/gio`, `Intl.NumberFormat('vi-VN')` deu trung. => `R-06` DONG (khong co phan ky). `Q-02` con MO nhung ha xuong refactor P3: hien co HAI ban giong het cua cung grammar nhan, giu dong bo boi hang rao `readFileSync` cua `AC-14`; gop ve MOT nguon (trang chu import tu `public-listing.labels.ts`) lam SAU khi go-live-20 merge -- khong phai bay gio vi se la task moi cham `page.tsx` vua ACCEPTED. `PLN-68` -- ruling cua chinh luot Tier 1 TU CODE go-live-20 (sep mien Iron Rule 1 cho luot nay), nam dieu rut ra deu tu phep do chu khong tu suy dien. MOT: mot nguoi vua viet contract vua code thi ban giao khong the la ban tu khen -- muc 5 cua HANDOFF phai chua hang `Tu bac`, va lan nay dung SAU hang tu bac tren mot muoi bay `LIM-*`; Tier 3 phai audit lai dung sau hang ay truoc tien, vi do la cho ma mot nguoi tu cham diem se noi long tay nhat. HAI: worktree rieng CO LAP DUOC index nhung doi cach DOC -- ban giao chua commit thi `git show HEAD:<path>` tra rong, phai `git show :<path>` hoac doc tep trong worktree, va moi lenh giao phai noi ro worktree nao neu khong Tier 3 se ket luan "khong co ban giao". BA: `H-01` cua `verify-handoff.ps1` MU ve trang thai staged khi goi voi `-RepoRoot` tuong doi -- `Get-RelativeRepoPath` o `gate-lib.ps1:82..92` chi cat tien to khi duong dan tuyet doi bat dau bang `$RepoRoot`, voi dau cham thi `$root` la `.\` nen ham tra ve nguyen duong dan tuyet doi va no khong bao gio khop danh sach `git diff --cached --name-only`, cho ra `staged=False` tren mot tep DANG stage; verdict khong doi vi H-01 canh bao chi khi CA tracked va staged deu false, nhung con so doc duoc thi doi, nen luat la goi cong bang duong dan TUYET DOI cho ca ba tham so. BON: dong `=== CMD:` trong evidence phai duoc NOI TU CHINH bien da truyen cho loi goi, khong viet tay -- ban viet tay lech khoi chuoi that su chay va dau vet lo ra o dong `subject:` (in duong dan tuyet doi trong khi CMD ghi tuong doi). NAM: pathspec cua git giai TUONG DOI theo cwd, nen `git diff --cached --name-only -- app src` chay tu thu muc `evidence/` tra `0` chu khong phai `9`; moi phep do pham vi phai chay tu GOC worktree.
```

<!-- ROADMAP_CURSOR_ARCHIVE_END -->

### Quy tắc của cursor

- Cursor chỉ trả lời: **đang ở đâu, gate nào, artifact nào, lệnh gì tiếp theo**.
- `current_task` tối đa một task. Không mở nhiều task chỉ vì chúng cùng phase.
- Không ghi HEAD, số commit ahead, danh sách file dirty hoặc test count vào cursor; Agent nhận việc phải kiểm tra Git/artifact mới nhất.
- Chi tiết scope, baseline, dependency, AC và quyết định nằm trong `TASK.md`; không nhân bản vào handoff.
- Nếu cursor mâu thuẫn với TASK/HANDOFF/AUDIT, dừng và đối chiếu source of truth theo §2 trước khi làm.

## 1. Vai trò cố định của Tier 1

Tier 1 biến yêu cầu của sếp thành contract đủ chặt để Tier 2 thực thi và Tier 3 audit. Tier 1 sở hữu quyết định product/architecture, scope, acceptance và audit resolution; **không sửa source code**.

| Tier | Artifact sở hữu | Trách nhiệm | Không được làm |
|---|---|---|---|
| Tier 1 — Planner | `TASK.md` | Contract, decision, status, resolution | Không implement; không viết thay HANDOFF/AUDIT |
| Tier 2 — Engineer | `HANDOFF.md` | Implement, test, evidence thực thi | Không đổi contract; không tự audit/ACCEPTED |
| Tier 3 — Auditor | `AUDIT.md` | Audit độc lập, C-01..C-10, verdict | Không sửa source/TASK/HANDOFF |

Chỉ phá ranh giới khi sếp ủy quyền đích danh trong lượt hiện tại. Sau MP-3B, sếp đã nhắc Tier 1 chỉ viết contract/resolve và để đúng Tier 2/Tier 3 thực hiện phần của họ.

**Owner process decision 2026-08-27:** `hrp-v5-ops-04a-observability-foundation` là task song song cuối cùng của Tier 2-B. Sau khi task này được audit/resolve, chỉ duy trì **một Tier 2** và một execution stream tại một thời điểm để tránh code rẽ nhánh và đơn giản hóa bàn giao. Tier 1 không tự mở thêm parallel Tier 2/worktree; chỉ được làm lại khi Owner ủy quyền rõ trong một lượt sau.

## 2. Source of truth và thứ tự đọc khi nhận bàn giao

1. Khối `ROADMAP_CURSOR` ở §0 để biết điểm vào.
2. `.ai-pipeline/tier1.md`.
3. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md`.
4. `.ai-pipeline/templates/TASK.template.md`.
5. `docs/UNIFIED_PLAN_v5.md` — roadmap/domain canonical.
6. `docs/V5_3_TIER_EXECUTION_GUIDE.md`.
7. `TASK.md`, rồi `HANDOFF.md`/`AUDIT.md` của task trong cursor nếu tồn tại.
8. Git và source/schema/test liên quan ở chế độ read-only để xác minh baseline.

Repo có `.codegraph/`: dùng CodeGraph trước khi `rg`/đọc file khi cần hiểu code. Nếu kết quả thiếu hoặc mâu thuẫn HEAD, ghi limitation và fallback sang `rg --files`, source inspection và Git; không bịa evidence.

Không dùng roadmap V4/Portal legacy để chọn task V5 mới. Không dùng file handover này thay TASK hoặc master plan.

## 3. State machine và current gate

Giá trị hợp lệ cho `current_gate`:

| Gate | Điều kiện quan sát | Tier 1 làm gì |
|---|---|---|
| `PLANNER_CONTRACT` | Chưa có TASK READY | Khảo sát read-only, viết TASK, verify-task |
| `TIER_2_EXECUTION` | TASK `READY_FOR_EXECUTION` | Báo đúng `/code <slug>`, không implement thay |
| `TIER_3_AUDIT` | HANDOFF kết `READY_FOR_AUDIT` | Báo `/audit <slug>`, không audit thay |
| `TIER_1_RESOLVE` | AUDIT đã bàn giao | Chạy resolve protocol §6 |
| `REVISION_EXECUTION` | TASK `REVISION_REQUIRED` có directive | Giao lại `/code <slug>` đúng round |
| `BLOCKED_OWNER` | Cần secret/DB/ADR/quyền OP từ sếp | Ghi owner + điều kiện mở khóa; không force-pass |
| `PHASE_REVIEW` | Task cuối phase đã ACCEPTED | Review exit gate rồi chọn candidate kế tiếp |

Task status hợp lệ: `DRAFT → READY_FOR_EXECUTION → REVISION_REQUIRED | ACCEPTED | CANCELLED`. `READY_FOR_AUDIT` và verdict PASS/CONDITIONAL/BLOCKED thuộc HANDOFF/AUDIT, không phải Tier 1 tự gán vào TASK.

## 4. Vòng lặp vận hành chuẩn

```text
Cursor
  → đọc artifact tại current gate
  → thực hiện đúng quyền Tier 1
  → verify cơ học tương ứng
  → chuyển đúng tier/gate
  → chỉ khi gate thay đổi: cập nhật ROADMAP_CURSOR
```

### Khi tạo contract

1. Khảo sát master plan + source/schema/test read-only; khóa baseline và phương pháp evidence.
2. Viết duy nhất `docs/tasks/<slug>/TASK.md` theo template.
3. Bắt buộc có `RQ-xx → STEP-xx → AC-xx`, scope/out-of-scope, decision, risk, rollback và stop condition.
4. Open Question làm đổi implementation phải rỗng trước `READY_FOR_EXECUTION`.
5. Chạy `verify-task.ps1`; chỉ sau PASS mới đặt cursor thành `TIER_2_EXECUTION`.

### Khi giao việc

- CODE READY: `/code <task-slug>`.
- HANDOFF `READY_FOR_AUDIT`: `/audit <task-slug>`.
- Design dùng Figma Owner và `/audit-design <task-slug>`; không giao `/code`.
- Mỗi lần báo sếp phải nêu: task path, spec version, status và hành động kế tiếp.

## 5. Contract quality gate

TASK chỉ được `READY_FOR_EXECUTION` khi:

- Outcome/non-goal và scope đủ rõ; không có quyết định nghiệp vụ bị đẩy cho Tier 2/3.
- Baseline, dependency và destructive/OP action đã xác định owner.
- Mọi RQ có STEP và AC đo được; evidence yêu cầu là thật, không mock khi contract yêu cầu LIVE.
- Interface/data/state/permission/idempotency/concurrency được khóa đúng mức rủi ro.
- Stop condition buộc Tier 2 dừng nếu cần schema/dependency/secret/quyền ngoài contract.
- Không vi mô hóa private implementation nếu public contract và invariant đã đủ rõ.

Contract thay đổi thì tăng spec version. Chỉ lỗi implementation thì giữ spec và mở execution round mới. Resolution luôn append-only trong TASK.

## 6. Resolve Protocol — Tier 1 gate nhẹ

1. Chạy `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md`.
2. FAIL: yêu cầu Tier 3 chuẩn hóa/bổ sung AUDIT; không re-audit sâu.
3. PASS: đọc findings P0→P3, Mandatory Checks và verdict.
4. Evidence nhất quán + PASS/CONDITIONAL: ghi resolution; spot-check tối đa ba điểm rủi ro cao nếu cần.
5. Evidence thiếu/mâu thuẫn hoặc P0/P1 chưa đóng: `REVISION_REQUIRED` và directive đo được.
6. Ghi từng finding bằng `ACCEPT_FIX`, `REJECT`, `DEFER` hoặc `NEED_USER_DECISION`.
7. Chỉ đặt `ACCEPTED` sau audit hợp lệ và resolution đầy đủ. Source đổi sau audit phải audit lại.

Waiver không phải test PASS. Phải ghi người quyết định, evidence thiếu, residual risk và follow-up. Tiền lệ MP-3C: founder waived browser evidence AC-08; không được kể lại rằng browser test đã chạy PASS.

## 7. Roadmap là dependency graph, không phải chuỗi kể chuyện

### Gate gần hiện tại

`M1-06b → audit/resolve → M1-06c → audit/resolve`. Chuỗi M1-06b/M1-06c đóng từ 27/08, không còn là gate. Gate hiện tại của lane V5 go-live: 14 rồi 09 rồi task UI nhỏ thứ sáu rồi F-05 rồi R-02 rồi hardening công khai rồi /admin/jobs rồi hạ tầng test trình duyệt rồi 07, chạy tuần tự vì chỉ một Tier 2 tại một thời điểm. 07 đứng cuối vì nó chứng minh mọi thứ phía trên, và Non-goals của chính nó cấm sửa mã trong lúc drill.

### Các lane canonical

- M1 security: hoàn tất M1-07, M1-08, M1-09. Master plan gom M1-05..09; không mặc định chuỗi cứng `M1-07 → M1-08 → M1-09` nếu TASK chưa chứng minh.
- Owner sequencing override 2026-08-28: sau M1-08, chạy `hrp-v5-go-live-01-single-domain-consolidation` để gom Vendor/Worker/CTV về path trên `hrpartner.vn`; ACCEPT task này rồi mới quay lại M1-09.
- M1-09 được tách truthful: `hrp-v5-m1-09a-current-field-projection` đóng các surface hiện có; M1-09B chỉ mở sau M8-06 vì repo chưa có `Payment/PaymentAllocation`. Không mock-pass hoặc tự thêm schema trong M1-09A.
- M35 backbone: `M35-01 → M35-02..05 → M35-06 → M35-07..09`.
- M35-09 giao với GPS/offline/check-in của M7 và PORTAL-06; phải tách dependency trước khi mở.
- OPS-02/04/06 là hardening lane có thể xen kẽ khi dependency thật cho phép; không tự gán quan hệ cứng với M1.
- M7: `M7-01..03 → M7-04..06 → M7-07 → M7-08`.
- M8: `M8-01..04 → M8-05..06 → M8-07..08`.
- Owner override 2026-08-28: `/bcc` đã retire; production payroll/payslip thuộc ứng dụng lương riêng. `PAY-01..08` là lane `DEFERRED_FINAL`, chỉ tái đánh giá sau Marketplace/Affiliate/M7/M8/M6/M9 và core UAT/cutover khi Founder mở lại. Payroll không block HRP go-live.
- M6-01..03 có thể chuẩn bị sau permission baseline; M6-04..07 chờ input canonical từ M7/M8 theo từng task. Không ép thành chuỗi cứng `M7 → M8 → M6 → PAY`.
- M9 là P2, chỉ mở sau khi core ổn định.

Trước mỗi TASK mới, Tier 1 phải lập trong TASK bảng `Dependency | Source | Satisfied evidence | Blocker`. Dependency suy luận phải ghi `ASSUMPTION`, lý do và stop condition. Không bỏ task UI/exit gate cuối chuỗi, đặc biệt M7-08 và M8-07..08.

## 8. Standing architecture và security facts

- HRP là outsourcing marketplace/platform; CTV là referrer/collaborator, không đồng nghĩa Worker.
- Auth hiện hữu là identity-core/JWT riêng dùng `jose`, cookie `hrp_token` và `AuthContext`; **không phải NextAuth** và không được viết lại login/JWT/cookie/register (DEC-11).
- Có 13 `SystemRole`; projection và scope phải test đủ role liên quan, role ngoài scope deny-by-default.
- Target boundary: verified AuthContext → L1 role/action/scoped repository → L2 RLS transaction-local cùng DB transaction. Không tuyên bố mọi route đã đạt trước khi M1-06/07 đóng.
- `withAuthorizedDb`/scoped repository là boundary implementation hiện hành từ M1-06a; không tạo wrapper cạnh tranh chỉ vì master plan dùng tên khái niệm `withAuthScope`.
- Phân biệt **đã triển khai** với **roadmap target**. QStash/R2, EmploymentEpisode và PAY canonical không được mô tả là production-complete nếu TASK tương ứng chưa ACCEPTED.
- Không tạo lại `/bcc`, không dùng `/bcc` làm login fallback và không đưa màn tính/xem lương trở lại HRP nếu chưa có quyết định mới của Founder. HRP chỉ giữ contract tích hợp/dữ liệu nguồn cần thiết cho ứng dụng lương riêng.
- Không log/commit secret, token, password, connection string hoặc PII thật.

DB LIVE test chỉ dùng target an toàn và fail closed. Env từng dùng nằm ngoài repo tại `C:\CodeApp\Salary-app\.env.mp2-test.local`, với `DATABASE_URL_TEST` và `DATABASE_URL_ADMIN_TEST`; không in giá trị. Thiếu target/role hợp lệ là `ENV_BLOCKED`, không mock/force-pass.

## 9. Git, worktree và vùng bảo vệ

- Mỗi Agent nhận việc phải tự chạy read-only `git status --short --branch`, `git log` và kiểm tra diff scope. Không tin snapshot Git trong hội thoại cũ.
- Thay đổi không thuộc task là của người dùng/luồng khác: không reset, restore, overwrite, xóa, stage hoặc commit.
- Cấm `git add -A` và `git add .`; chỉ stage path trong scope.
- Không commit/push/merge nếu sếp hoặc TASK không yêu cầu rõ. Không mặc định push sau resolve.
- Không chạy migration/seed/destructive action trên production. OP action có owner là sếp cần ủy quyền rõ.

## 10. Cách cập nhật Living Handoff khi chuyển Agent

Trong tiến độ bình thường, chỉ sửa khối `ROADMAP_CURSOR` ở §0, từ marker mở có hậu tố `START` đến marker đóng có hậu tố `END`. Toàn file phải luôn chỉ có đúng một cặp marker thật.

Quy trình cập nhật:

1. Đọc TASK/HANDOFF/AUDIT và xác nhận gate thực tế.
2. Cập nhật `updated_at`, lane/task/path/spec/status/gate/command, previous accepted, next candidate, blocker và một cursor note ngắn.
3. Không đưa test count, commit list, chi tiết scope hoặc lịch sử phase vào cursor.
4. Chạy `git diff --check -- docs/PLANNER_HANDOVER.md`.
5. Chỉ sửa section ổn định khi pipeline rule, standing ADR hoặc dependency canonical thực sự thay đổi; khi đó tăng Living Handoff version và ghi revision log.

### Mẫu cursor cho lần sau

```yaml
updated_at: YYYY-MM-DD Asia/Bangkok
roadmap_source: docs/UNIFIED_PLAN_v5.md
current_lane: <phase/lane>
current_task: <slug hoặc none>
task_path: <path hoặc none>
spec_version: <vX.Y hoặc n/a>
task_status: <status hoặc n/a>
current_gate: <giá trị §3>
next_command: <lệnh hoặc hành động Planner>
previous_accepted: <slug gần nhất>
next_planner_candidate: <ID/slug dự kiến, chưa coi là task đã mở>
blocking_owner: <none hoặc owner + điều kiện>
cursor_note: <một câu về exit gate/dependency quan trọng nhất>
```

## 11. Checklist tiếp quản trong 5 phút

- [ ] Đọc cursor và TASK được trỏ tới.
- [ ] Xác minh artifact có status khớp cursor.
- [ ] Kiểm tra Git/worktree mới nhất; bảo vệ thay đổi ngoài scope.
- [ ] Xác định đúng current gate và chỉ làm quyền Tier 1.
- [ ] Nếu giao tier khác, dùng đúng lệnh và không làm thay.
- [ ] Nếu chọn task mới, kiểm tra dependency graph và phase exit gate trước khi viết contract.
- [ ] Sau khi gate đổi, chỉ cập nhật cursor.

## 12. Revision log của Living Handoff

| Version | Ngày | Thay đổi cấu trúc ổn định |
|---|---|---|
| 2.0 | 25/08/2026 | Chuyển từ snapshot handover sang Living Handoff: một ROADMAP_CURSOR mutable; chuẩn hóa role, state/gate, resolve, dependency graph, standing security, Git safety và protocol tiếp quản. |
| 2.1 | 27/08/2026 | Ghi quyết định của Owner: OPS-04a là task Tier 2-B cuối cùng; sau resolve quay về một Tier 2/một execution stream, không tự mở parallel worktree. |
| 2.2 | 01/09/2026 | Thêm §13 — sổ nợ credential hygiene phải trả **trước khi public**. Owner quyết định 01/09: đang giai đoạn build, hoãn toàn bộ việc rotate, dồn vào một cửa trước lúc công bố; từ nay mọi yêu cầu rotate/xoá secret ghi vào §13 chứ không chặn round |
| 2.3 | 07/09/2026 | Chuyển cursor sang TEST-01 round 4 sau khi RF-06/RF-05/go-live-20 đã commit; huỷ contract M11 Affiliate sai phạm vi; mở contract go-live-21 ở DRAFT và đo lại sổ credential theo trạng thái file/seed hiện tại |

## 13. Credential hygiene — sổ nợ, LÀM CUỐI CÙNG trước khi public

**Quyết định của Owner, 01/09/2026:** đang giai đoạn build app, chưa công bố, nên **hoãn toàn bộ việc rotate**. Không task nào bị chặn vì mục nào trong bảng này, và Tier 1 không được nâng chúng thành blocker. Chúng dồn vào **một cửa duy nhất ngay trước khi public** và phải trả **hết** ở cửa đó. Từ nay mọi phát hiện rò rỉ secret ghi thêm một dòng vào đây, ghi đúng ngày và nguồn, rồi đi tiếp.

| # | Việc | Vì sao có trong sổ | Ngày vào sổ |
|---|---|---|---|
| 1 | Rotate `neondb_owner` — **hai** password khác nhau đã lộ, trong đó bộ lấy từ `.env` là **PRODUCTION** | Bộ thứ nhất lộ từ đợt xử drift/seed; bộ thứ hai bị phiên audit go-live-05 dán vào lệnh shell | `29/08` + `01/09` |
| 2 | Rotate `cloud_admin` | Phiên audit go-live-05 dán connection string kèm password thật vào lệnh shell (`F-04`) | `01/09` |
| 3 | Rotate `app_user_writer` | Cùng nguồn `F-04` | `01/09` |
| 4 | Phân loại local env hiện hữu; `.env.test.local` đã vắng | Đo lại `07/09`: có `.env.local`, `.env.ops06a-test.local`, `.env.production.local`, đều ignored; Owner phải ghi KEEP/DELETE từng file, không xoá blanket | `01/09`, đo lại `07/09` |
| 5 | Cập nhật lại `DATABASE_URL_ADMIN` sau khi rotate | Chuỗi cũ chết ngay khi password đổi ⇒ phải làm **sau** mục 1-3, cùng lượt | `29/08` |
| 6 | Xoá biến `DB_DIAG_TOKEN` | Cửa hậu chẩn đoán, không có lý do tồn tại trên bề mặt công khai | `29/08` |
| 7 | Xoá residual password literal trong `prisma/seed.mjs` và giữ fail-closed env behavior | Đo lại `07/09`: hai account đầu đã dùng explicit env + skip khi thiếu; một worker demo còn hash password literal. Không viết lại phần đã đúng | `29/08`, đo lại `07/09` |
| 8 | Dọn `scratch/*` | Chứa script probe DB và tiện ích một lần; vài file có logic nối DB | `29/08` |
| 9 | Xoá Neon branch `pre-mp2-remediation-2026-08-28` | Branch cứu hộ đã hết vai trò. **Không** đụng `hrp_mp2_test` (`br-misty-cell-az3nx5l3`) — đó là branch duy nhất đủ ma trận RLS | `28/08` |
| 10 | Xoá sạch dữ liệu DEMO | **2 trong 5** slug công khai hiện **không** mang tiền tố `DEMO`, nên không thể dọn bằng một câu lệnh theo prefix — phải liệt kê từng slug | `31/08` |
| 11 | Soát lại lần cuối: chỉ `.env.example` được tracked và chỉ chứa empty/placeholder; không còn active connection string trong HEAD/index/worktree/task artifacts | Đo `07/09` thấy `.env.dev`, `.env.preview`, `.env.prod.test` đang tracked và có key SET cần coi là secret cho tới khi rotate/untrack | `01/09`, nâng mức `07/09` |

**Cách trả cửa này:** contract thực thi là `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md`. Tier 2 chỉ chuẩn bị repo hygiene, manifest, dry-run và rollback. Owner/OP làm rotation, Vercel, branch và production cleanup theo đúng state order trong task. Tier 3 audit độc lập sau cùng. Task giữ `DRAFT` cho tới khi TEST-01 đóng vì hai task cùng sở hữu `.gitignore`.
