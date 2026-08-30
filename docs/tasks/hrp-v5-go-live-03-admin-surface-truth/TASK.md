# TASK: hrp-v5-go-live-03-admin-surface-truth

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-03-admin-surface-truth` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` — Audit Round 2 PASS; Tier 1 resolved ngày 2026-08-30 |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — độc lập |
| Baseline | `776a3c1` trên `main` (đã khoá; `git log -1` xác nhận trước khi code) |
| Modules | Admin shell + `/admin` overview + `/admin/jobs` + `/admin/projects` + `/admin/staffing` |
| ADR references | None |
| Current execution round | `1` (không mở round 2 — code không phải chỗ lỗi) |
| Current audit round | `2` |
| Next gate | `CLOSED` — chuyển execution stream sang `hrp-v5-go-live-04-public-read-rls-closure` |
| Updated | `2026-08-30 14:05 Asia/Bangkok` |

Điều kiện xếp hàng đã hết: `hrp-v5-go-live-02-public-surface-exposure` `ACCEPTED` và đã đóng bằng evidence live (push `776a3c1`, đo `/docs/**` 404 + title đúng), nên stream Tier 2 trống và task này mở round 1.

Baseline đổi từ `ad79d72` (v0.9) sang `776a3c1` vì task 02 đã commit 3 lần lên `main` sau khi contract này được viết. Working tree lúc khoá baseline có 2 file dirty **không thuộc task này**: `public/index.html` (side-effect của `scripts/copy-static.mjs`, file tracked) và `docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md` (artifact Tier 3). Cấm stage, cấm restore, cấm dọn 2 file đó.

## 1. Outcome

### User-visible outcome

Sếp mở `hrpartner.vn/admin` thấy **một hệ thống vận hành**, không phải bảng theo dõi pipeline, và làm được việc mà hôm nay UI chặn:

- Sidebar không còn nhãn `M2` `M3` `M4` `M7`; header không còn "Nội bộ — Phase 4".
- Trang Tổng quan không còn "Phase 4 slice 4A–4D", "UI skeleton (DEC-17)", "Moment ...", khối "Tiến độ Round 2 / Phase 4" với các dòng mã STEP và mã AC của pipeline.
- `/admin/jobs`: khi publish lỗi, **danh sách dự án vẫn còn** và lỗi biến mất khi thử lại thành công — hiện tại lỗi thay thế toàn bộ bảng nên sếp mất luôn nút bấm.
- Cột "Slots" ở `/admin/jobs` đổi tên thành "Slot trống" và hiển thị **số slot thật còn trống theo đúng điều kiện publish**, nên nhìn cột đó là biết bấm publish có được không; hiện tại nó in `project.quota` (mặc định 0) — sai lệch hoàn toàn.
- Form tạo dự án có ô **quota** và **địa chỉ công trường**; API đã nhận 2 field này, chỉ thiếu ô nhập. Không set quota thì lần chuyển ứng viên đầu tiên sẽ `409 PROJECT_QUOTA_FULL`.
- Form tạo đơn tuyển (staffing order) **chọn dự án từ danh sách** thay vì dán UUID bằng tay, và nhập được mã vị trí, lương giờ, giờ vào/ra, địa điểm, hạn nhận đơn, ngày hết hiệu lực — backend đã nhận hết, chỉ UI thiếu.

### Non-goals

- Không viết mới trang `/admin/settings` (mọi link `href: '#'`); chỉ gắn nhãn trung thực.
- Không làm `/admin/tickets`, `/admin/users`, `/admin/payroll` thành trang có thao tác — 3 trang này hiện chỉ đọc, đúng thiết kế hiện tại.
- Không đổi API, không đổi schema, không migration. Mọi RQ dưới đây làm được bằng UI + query hiện có.
- Không đụng public surface (`/ve-chung-toi`, `scripts/copy-static.mjs`) — thuộc task 02.
- Không đổi phân quyền, không đổi RLS.
- Không xử lý lệch quyền `EV-18` (nav mở `/admin/staffing` cho HR_STAFF/PM nhưng API chỉ cho ADMIN/HR_MANAGER/SALE tạo order). Cùng họ lỗi "surface nói không thật" nhưng sửa đúng cách là đổi role gate — vi phạm `INV-02`. Ghi nhận thành follow-up, cấm Tier 2 tự làm.
- Không tạo user, không tạo password, không nhập PII thật khi dựng dữ liệu thử (`DEC-09`).

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | `src/shared/ui/role-guard/role-guard-layout.tsx:120-123`, `:127` | `ADMIN_NAV_PHASE4` gắn `badge: 'M3'`, `'M7'`, `'M4'`, `'M2'`, `'M7'` | Nhãn module hiện trên sidebar mọi trang admin |
| `EV-02` | `app/admin/admin-shell.tsx:56` | `brandSubtitle="Nội bộ — Phase 4"` truyền vào layout | Chuỗi pipeline ở header admin |
| `EV-03` | `src/shared/ui/role-guard/role-guard-layout.tsx:60-95` | Export `ADMIN_NAV` không được import ở đâu, chứa `/admin/statements` — route không tồn tại | Dead code gây hiểu sai khi đọc source |
| `EV-04` | `app/admin/page.tsx:112` | Header ghi "Phase 4 slice 4A–4D — 4 nhóm nghiệp vụ chính. UI skeleton (DEC-17), số liệu thật sẽ gắn ở sub-round tiếp" | Trang Tổng quan tự nhận là skeleton |
| `EV-05` | `app/admin/page.tsx:139-147` | Card render `{card.module}`, `{card.narrative}`, `Moment {card.moment}` | Jargon nội bộ trong nội dung card |
| `EV-06` | `app/admin/page.tsx:157-172` | Khối "Tiến độ Round 2 / Phase 4" in ba dòng nhật ký pipeline: một dòng mã STEP kèm mã AC và tỉ lệ "7/7 PASS" cho RLS `staffing_order_slots`, một dòng "round 2 đang thi công", một dòng "theo budget Tier 1" | Nhật ký pipeline nằm thẳng trên trang vận hành |
| `EV-07` | `app/admin/jobs/page.tsx:219-248` | Nếu `jobsError` khác rỗng, bảng render đúng một hàng lỗi chiếm cả 5 cột thay cho toàn bộ danh sách; `jobsError` set cả khi publish lỗi | Một lỗi publish làm mất danh sách, sếp không còn nút để thử lại |
| `EV-08` | `app/admin/jobs/page.tsx:110-111` | `availableSlots: project.quota ?? 0` | Cột Slots in quota (mặc định 0), không phải slot trống thật |
| `EV-09` | `app/api/projects/route.ts:112` | `GET /api/projects` chỉ `include: { clientCompany }`, không kèm staffing order/slot | Muốn slot thật phải gọi thêm `/api/staffing/orders` |
| `EV-10` | `app/api/projects/route.ts:129`, `:133` | `POST /api/projects` đã destructure và ghi `siteAddress`, `quota` | Chỉ thiếu ô nhập ở UI, không cần sửa API |
| `EV-11` | `app/admin/staffing/page.tsx:51-80` | `CreateModal` chỉ có title/projectId/positionTitle/slotsNeeded; `projectId` là input text UUID; body hardcode `positionCode: 'GEN'` và `validFrom` = hôm nay | Không nhập được lương/giờ/địa điểm/deadline |
| `EV-12` | `app/api/staffing/orders/route.ts:100-116` | Validate chỉ projectId/title/slots + positionCode/positionTitle/slotsNeeded/validFrom, rồi truyền cả body cho `createStaffingOrder`, hàm này đã map `hourlyRateVnd`, `shiftStart`, `shiftEnd`, `workLocation`, `deadlineDate`, `validTo` | Thêm field ở UI là đủ, backend không đổi |
| `EV-13` | `app/admin/settings/page.tsx` | `SETTINGS_GROUPS` toàn bộ `href: '#'`, subtitle "Module M7 — Cấu hình hệ thống", footer "Các module cài đặt chi tiết đang được phát triển" | Trang mockup thật; cần nhãn trung thực chứ không xoá |
| `EV-14` | Kiểm kê 16 trang `/admin/**` 2026-08-29 | 11 trang có write thật (staffing, jobs, projects, clients, vendors, workers, applications, attendance, reconciliation, commission/policies, commission/ledger), 3 trang chỉ đọc (tickets, users, payroll), 2 trang tĩnh (`/admin`, `/admin/settings`) | "Đa số là mockup" là cảm nhận do nhãn + trang Tổng quan tĩnh, không đúng với 11 trang có thao tác |
| `EV-15` | `app/admin/projects/page.tsx:208` | Bảng dự án chỉ render 6 cột `Mã / Tên dự án / Trạng thái / Ngày bắt đầu / Ngày tạo / Hành động`; không cột nào in `project.id` | Không có đường nào trên UI để lấy UUID dự án, nên input `projectId` ở form tạo order (`EV-11`) là ngõ chết tuyệt đối chứ không chỉ bất tiện. `RQ-07` giữ mức MUST |
| `EV-16` | `src/domains/staffing/order.service.ts:150-160` | `listStaffingOrders` dùng `include` ở cấp order nên trả đủ scalar (`status`, `deadlineDate`, `projectId`), nhưng nested select của `slots` chỉ có `id`, `positionTitle`, `slotsNeeded`, `slotsFilled` — **thiếu `validTo`** | `DEC-03` cần `slot.validTo` mà API không trả. Nếu để nguyên, Tier 2 chạm stop condition ngay `STEP-04` và task tắc. Giải bằng `DEC-11` |
| `EV-17` | `app/api/staffing/orders/route.ts:57`, `:65` | `take = Math.min(50, ...)` mặc định 20; response kèm `total` | Gom slot theo dự án từ một lần gọi list là sai khi số order nhiều hơn trang đầu. Giải bằng `DEC-12` |
| `EV-18` | `app/api/staffing/orders/route.ts:33` so với `src/shared/ui/role-guard/role-guard-layout.tsx:120` | `CREATE_ROLES` = ADMIN/HR_MANAGER/SALE, còn nav mở `/admin/staffing` cho ADMIN/HR_STAFF/HR_MANAGER/PM | HR_STAFF và PM thấy nút "Tạo Order" rồi nhận `403`. Cùng họ lỗi nhưng sửa đúng cách là đổi role gate, vi phạm `INV-02` — để ngoài scope round này |
| `EV-19` | Tier 1 đo live `GET https://www.hrpartner.vn/api/jobs` 2026-08-29 15:4x | Trả `total: 0`, mảng `jobs` rỗng | Chưa có dự án nào published; `AC-05`/`AC-06` phải tự dựng dữ liệu order, không dựa vào dữ liệu sẵn có |
| `EV-20` | `src/domains/staffing/order.service.test.ts:214-220` | Test list chỉ assert `objectContaining({ where: ... })`, không assert hình dạng `select`/`include` | Thêm một field vào nested select không làm vỡ unit test hiện có |
| `EV-21` | `scratch/seed-hrp-live-demo.sql`, Owner chạy trên Neon Console branch `hrp-live` / DB `neondb` 2026-08-29 16:11 | 7 statement: `BEGIN`, `INSERT 1` (client), `INSERT 2` (dự án), `INSERT 2` (order), `INSERT 2` (slot), `COMMIT`, `SELECT 2` — đúng số dòng kỳ vọng, query kiểm tra trả 2 dòng nên cả 2 dự án đều có order kèm slot | Dữ liệu cho `AC-03..AC-08` đã có sẵn trên DB, Tier 2 **không cần chạy `STEP-00` lại**; chỉ xác nhận và ghi lại trạng thái đầu round |
| `EV-22` | Tier 1 đo lại `GET https://www.hrpartner.vn/api/jobs` sau khi seed, 2026-08-29 | Vẫn `total: 0`, `jobs` rỗng | `is_public = FALSE` của seed giữ đúng: dữ liệu `DEMO` chưa lên bề mặt công khai. Đây là mốc so sánh cho `AC-12` |
| `EV-23` | `app/admin/jobs/page.tsx:110-111`, `:231` | Cột render `{job.availableSlots} / {job.totalNeeded}` mà **cả hai** đều gán `project.quota ?? 0` | Với dữ liệu `DEMO` cột sẽ in `20 / 20` và `15 / 15` trong khi slot trống thật là 10 và 5 — không chỉ sai số, mà in cùng một con số hai lần. `RQ-05` phải sửa cả hai vế, không chỉ vế trái |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Bỏ hẳn `badge` khỏi nav admin thay vì đổi tên nhãn. Nhãn module là ngôn ngữ nội bộ, không phục vụ người vận hành | Tier 1 / `EV-01` | Chốt 2026-08-29 |
| `DEC-02` | CHOSEN | Trang `/admin` giữ nguyên là trang điều hướng tĩnh (card trỏ tới các nhóm nghiệp vụ), chỉ bỏ jargon. KHÔNG gắn số liệu thật trong task này — gắn KPI là task riêng có nguồn dữ liệu riêng | Tier 1 / `EV-04`, `EV-05` | Chốt 2026-08-29 |
| `DEC-03` | CHOSEN | Cột Slots dùng đúng công thức của `publishJob`: chỉ tính order `OPEN` hoặc `CLOSING_SOON`, chưa hết hiệu lực, tổng `max(0, slotsNeeded - slotsFilled)`. Nếu không lấy được dữ liệu order thì hiển thị dấu gạch, KHÔNG in `0` và KHÔNG in quota | Tier 1 / `EV-08`, `EV-09` | Chốt 2026-08-29 |
| `DEC-04` | CHOSEN | Lấy slot bằng cách gọi `GET /api/staffing/orders` từ client rồi gom theo `projectId`, không sửa `GET /api/projects`. Lý do: giữ blast radius trong UI, API projects còn phục vụ nơi khác | Tier 1 / `EV-09` | Chốt 2026-08-29, đổi được nếu Tier 2 chứng minh payload orders quá lớn |
| `DEC-05` | CHOSEN | `/admin/settings` giữ nguyên là trang mockup nhưng phải nói thật: nhãn "Chưa khả dụng" trên từng nhóm và bỏ `href: '#'` để không giả vờ là link bấm được | Tier 1 / `EV-13` | Chốt 2026-08-29 |
| `DEC-06` | CHOSEN | Ô `quota` ở form dự án là số nguyên không âm, để trống nghĩa là 0 và UI phải cảnh báo ngắn rằng quota 0 sẽ chặn chuyển ứng viên. Không tự đổi default ở DB | Tier 1 / `EV-10` | Chốt 2026-08-29 |
| `DEC-07` | CHOSEN | Đóng `OQ-01` của v0.9: `/admin` **giữ điều hướng tĩnh**, không gắn KPI trong task này. Gắn số liệu thật là task riêng sau go-live vì cần chốt nguồn dữ liệu, khung thời gian và cache — không phải việc dọn chữ | Tier 1, Owner không phản đối trong lượt duyệt scope 2026-08-29 | Chốt 2026-08-29 |
| `DEC-08` | CHOSEN | Đóng `OQ-02` của v0.9: **không** thêm cột quota ở `/admin/jobs`. Quota đã có chỗ đọc/ghi đúng ở form dự án (`RQ-06`); thêm cột thứ hai cạnh "Slot trống" chỉ làm tăng khả năng đọc lẫn hai con số. Tiêu đề cột phải là "Slot trống" (`RISK-03`) | Tier 1 / `DEC-03` | Chốt 2026-08-29 |
| `DEC-09` | CHOSEN | Owner tuyên bố 2026-08-29: "chúng ta đang dev thôi, chưa lên production đâu, nên cứ seed thoải mái, sau này khi ok rồi xóa dữ liệu sau". Vì vậy `AC-03..AC-08` được phép thao tác trên DB đang phục vụ `www.hrpartner.vn` (Neon branch `hrp-live`) bằng dữ liệu prefix `DEMO`, và `ENV_BLOCKED` **không** còn là kết cục chấp nhận được cho các AC đó. Giới hạn vẫn giữ: chỉ INSERT/UPDATE bản ghi do chính round này tạo và có prefix `DEMO`; cấm UPDATE/DELETE bản ghi không phải `DEMO`; cấm tạo user/password/PII; cấm migration; cấm chạy `prisma/seed.mjs` (file này tạo 3 account đăng nhập được bằng mật khẩu cố định, trong khi domain đã mở ra internet) | Owner uỷ quyền trực tiếp 2026-08-29 | Hiệu lực tới khi Owner tuyên bố cutover production |
| `DEC-10` | CHOSEN | Kết thúc round, **Tier 2 không được để lại dự án nào do chính mình publish ở trạng thái `is_public = true`**. Nếu `AC-04` cần một lần publish thành công thì phải unpublish ngay sau khi chụp evidence. Ngược lại, dự án `DEMO` mà **Owner** tự publish là hợp lệ và **cấm Tier 2 unpublish nó**: lượt publish job thật đầu tiên thuộc Owner. Vì vậy `AC-12` đo bằng cách so trạng thái đầu round với cuối round, không đo bằng "phải rỗng" | Tier 1 / `EV-19`, `EV-22` | Chốt 2026-08-29, sửa cách đo ở v1.1 |
| `DEC-11` | CHOSEN | Cho phép **đúng một** thay đổi cộng thêm ngoài lớp UI: thêm `validTo: true` vào nested select của `slots` trong `listStaffingOrders` (`src/domains/staffing/order.service.ts`). Đây là điều kiện cần để `DEC-03` tính đúng; không thêm/bớt field nào khác, không đổi `where`, `orderBy`, `take`, không đổi scope, không đổi shape của `getStaffingOrder`. Additive nên không phá client nào đang dùng (`INV-01` vẫn đúng theo nghĩa không đổi payload mà API **nhận**) | Tier 1 / `EV-16`, `EV-20` | Chốt 2026-08-29 |
| `DEC-12` | CHOSEN | `/admin/jobs` gom slot bằng cách phân trang `GET /api/staffing/orders` với `take=50` cho tới khi phủ hết `total`, tối đa 10 trang. Dự án nào chưa được trang nào phủ tới thì cột Slot trống in dấu gạch, **cấm in `0`** — thà không biết còn hơn báo sai (`EV-17`) | Tier 1 / `EV-17` | Chốt 2026-08-29 |
| `DEC-13` | CHOSEN | **Phê chuẩn `DEV-01`** (Owner uỷ quyền giữa lượt, Tier 1 đã tự đọc lại diff): ngoài dòng `validTo: true` của `DEC-11`, `src/domains/staffing/order.service.ts` được sửa thêm **đúng một ký tự** — thêm `)` đóng `MAX(` trong chuỗi SQL của `generateOrderCode`, thành `MAX(SUBSTRING(code FROM 4)::bigint) AS max_num`. Lý do: chuỗi cũ khiến PostgreSQL trả `42601` nên `POST /api/staffing/orders` trả 500 100% số lần kể từ commit `8c7fb91`, và `AC-08` không thể đo mà không vá. Không sửa gì khác trong file; tổng `git diff --numstat -- src/domains/` phải đúng `2 2` | Tier 1 / Owner + `HANDOFF.md` §3.8, `DEV-01` | Chốt 2026-08-30 |
| `DEC-14` | CHOSEN | **Phê chuẩn `DEV-02`** (Owner uỷ quyền giữa lượt, Tier 1 đã tự đọc lại diff): mở `app/api/staffing/orders/route.ts` và `app/api/staffing/orders/[id]/route.ts` vào scope với giới hạn **đúng một helper thuần `bigintSafe` cộng 3 chỗ `return NextResponse.json(...)`**, không đổi status code, không đổi shape payload, không đổi guard/limiter/thứ tự. Lý do: `slot.hourlyRateVnd` là `BigInt` nên `NextResponse.json` ném `TypeError` và route trả 500 **sau khi đơn đã commit** — người vận hành bấm lại và tạo đơn trùng, đây là defect có thật ngoài UI. `Number(bigint)` chấp nhận được vì lương giờ VND còn rất xa `Number.MAX_SAFE_INTEGER` | Tier 1 / Owner + `HANDOFF.md` §3.7, `DEV-02` | Chốt 2026-08-30 |
| `DEC-15` | CHOSEN | Ba deviation còn lại được **chấp nhận, không revert**: `DEV-03` (2 chuỗi tiêu đề/nút trong modal staffing — thuộc quyền UI đã mở của `/admin/staffing`), `DEV-04` (contract ghi sai mã lỗi publish, xem `AC-03` đã sửa), `DEV-05` (mã `SO-000xx` do service tự sinh nên không mang prefix `DEMO`; dấu nhận biết là title mở đầu `DEMO ` và dự án cha `DA-DEMO-003`, đủ để `AC-12` truy vết) | Tier 1 / `HANDOFF.md` §5 | Chốt 2026-08-30 |

## 4. Contract

### 4.1 Requirements

| RQ | Requirement | Bắt buộc |
|---|---|---|
| `RQ-01` | `ADMIN_NAV_PHASE4` không còn field `badge` cho bất kỳ item nào, và UI không render badge nav nữa. `brandSubtitle="Nội bộ — Phase 4"` bỏ khỏi `app/admin/admin-shell.tsx`; nếu prop `brandSubtitle` thành không dùng thì bỏ luôn khỏi layout | MUST |
| `RQ-02` | Trang `/admin` không còn hiển thị: `module`, `narrative`, `Moment`, "Phase 4 slice", "UI skeleton", "DEC-17", khối "Tiến độ Round 2 / Phase 4" và mọi dòng `STEP-`/`AC-`. Card chỉ còn tiêu đề, mô tả nghiệp vụ dễ hiểu và link tới trang tương ứng | MUST |
| `RQ-03` | `/admin/jobs`: lỗi của một hành động (publish/unpublish) hiển thị ở banner trên bảng, **không** thay thế các hàng dữ liệu. Lỗi tải danh sách vẫn được hiển thị trong bảng như hiện tại nhưng phải phân biệt với lỗi hành động (2 state riêng) | MUST |
| `RQ-04` | Lỗi hành động phải tự xoá khi hành động sau thành công, và phải nêu rõ dự án nào lỗi | MUST |
| `RQ-05` | Cột Slots đổi tiêu đề thành "Slot trống" và hiển thị số slot còn trống thật theo `DEC-03`, lấy dữ liệu theo `DEC-11` + `DEC-12`; sửa **cả hai** vế `availableSlots` và `totalNeeded` đang cùng gán `project.quota` (`EV-23`); hiển thị dấu gạch khi chưa/không lấy được dữ liệu order hoặc dự án nằm ngoài phạm vi phân trang. Nút Publish không được bật khi số slot trống bằng 0 do đã có dữ liệu order xác nhận (nếu dữ liệu chưa về thì vẫn cho bấm và để API quyết) | MUST |
| `RQ-06` | Form tạo/sửa dự án ở `/admin/projects` có ô `quota` (số nguyên không âm) và `siteAddress`, gửi đúng tên field mà API nhận, kèm dòng nhắc ngắn về hệ quả quota 0 (`DEC-06`) | MUST |
| `RQ-07` | Form tạo staffing order: chọn dự án bằng select nạp từ `GET /api/projects` (hiển thị `code` và `name`), thêm ô `positionCode` (mặc định gợi ý `GEN`), `hourlyRateVnd`, `shiftStart`, `shiftEnd`, `workLocation`, `deadlineDate`, `validTo`. Field để trống thì không gửi lên (không gửi chuỗi rỗng) | MUST |
| `RQ-08` | `/admin/settings`: mỗi nhóm gắn nhãn "Chưa khả dụng", bỏ `href: '#'`, subtitle không còn "Module M7" | SHOULD |
| `RQ-09` | Xoá export `ADMIN_NAV` không dùng (`EV-03`) sau khi xác nhận không có import nào | SHOULD |
| `RQ-10` | Không hồi quy: `npm run typecheck`, `npm run lint`, `npm run test:unit` exit 0; không sửa `prisma/**`, `middleware.ts`, `vercel.json`; trong `app/api/**` chỉ đúng 2 file và 3 chỗ `return` mà `DEC-14` cho phép; trong `src/domains/**` chỉ đúng 2 dòng mà `DEC-11` + `DEC-13` cho phép | MUST |
| `RQ-11` | Vệ sinh dữ liệu thử theo `DEC-09` + `DEC-10`: mọi bản ghi do round này tạo đều có prefix `DEMO` nhận biết được, HANDOFF liệt kê đủ mã đã tạo kèm câu lệnh dọn, và trạng thái `is_public` cuối round không có dự án nào do Tier 2 publish mà chưa unpublish. Dự án `DEMO` do Owner publish thì để nguyên | MUST |

### 4.2 Scope file

| File | Được phép làm gì |
|---|---|
| `src/shared/ui/role-guard/role-guard-layout.tsx` | Bỏ `badge` khỏi `ADMIN_NAV_PHASE4` + chỗ render badge, bỏ dead export `ADMIN_NAV`, dọn prop `brandSubtitle` nếu thành vô dụng |
| `app/admin/admin-shell.tsx` | Bỏ `brandSubtitle` |
| `app/admin/page.tsx` | Bỏ jargon, đổi nội dung card sang ngôn ngữ nghiệp vụ, bỏ khối tiến độ |
| `app/admin/jobs/page.tsx` | Tách state lỗi, sửa render bảng, tính slot thật |
| `app/admin/projects/page.tsx` | Thêm 2 ô nhập vào modal |
| `app/admin/staffing/page.tsx` | Thay input UUID bằng select, thêm các ô mới |
| `app/admin/settings/page.tsx` | Nhãn trung thực |
| `src/domains/staffing/order.service.ts` | Thêm `validTo: true` vào nested select của `slots` trong `listStaffingOrders` theo `DEC-11`, **cộng** đúng một ký tự `)` đóng `MAX(` trong `generateOrderCode` theo `DEC-13`. Không sửa gì khác trong file |
| `app/api/staffing/orders/route.ts` | **Chỉ** thêm helper `bigintSafe` và bọc 2 chỗ `return NextResponse.json(...)` của `POST` theo `DEC-14`. Không đổi status code, guard, limiter, thứ tự, shape payload |
| `app/api/staffing/orders/[id]/route.ts` | **Chỉ** thêm helper `bigintSafe` và bọc 1 chỗ `return NextResponse.json(...)` của `GET` theo `DEC-14`. Không đổi status code, guard, limiter, thứ tự, shape payload |
| `docs/tasks/hrp-v5-go-live-03-admin-surface-truth/HANDOFF.md` | Tier 2 viết mới |

Ngoài danh sách trên: **không sửa**. Cấm sửa `prisma/**`, `middleware.ts`, `vercel.json`, cấm mọi file `app/api/**` khác ngoài đúng 2 file staffing của `DEC-14`, và cấm mọi file `src/domains/**` khác ngoài đúng 2 dòng của `DEC-11` + `DEC-13`.

### 4.3 Invariants

- `INV-01` Không đổi payload mà API **nhận**; chỉ gửi thêm field mà API đã hỗ trợ (`EV-10`, `EV-12`). Payload API **trả** chỉ được cộng thêm đúng field của `DEC-11`, không bớt field nào.
- `INV-02` Không đổi role gate của trang nào; `ALLOWED_ROLES` mỗi trang giữ nguyên.
- `INV-03` Publish vẫn đi qua `POST /api/projects/{id}/publish` với `expectedVersion` và `reason` như hiện tại; không bỏ optimistic concurrency.
- `INV-04` Không thêm dependency, không thêm env var, không thêm route mới.
- `INV-05` Text hiển thị cho người vận hành viết bằng tiếng Việt nghiệp vụ, không chứa ID pipeline.
- `INV-06` Không log, không dán vào HANDOFF connection string, token, mật khẩu hay PII thật; dữ liệu thử chỉ dùng tên công ty/dự án hư cấu có prefix `DEMO`.

### 4.4 Traceability

| RQ | STEP | AC |
|---|---|---|
| `RQ-01` | STEP-01 | AC-01 |
| `RQ-02` | STEP-02 | AC-02 |
| `RQ-03` | STEP-03 | AC-03 |
| `RQ-04` | STEP-03 | AC-04 |
| `RQ-05` | STEP-04 | AC-05, AC-06 |
| `RQ-06` | STEP-05 | AC-07 |
| `RQ-07` | STEP-06 | AC-08 |
| `RQ-08` | STEP-07 | AC-09 |
| `RQ-09` | STEP-08 | AC-10 |
| `RQ-10` | STEP-09 | AC-11 |
| `RQ-11` | STEP-10 | AC-12 |

## 5. Execution Plan

| STEP | Việc | Evidence Tier 2 phải nộp |
|---|---|---|
| `STEP-00` | Xác nhận dữ liệu thử đã có (`EV-21`): chạy query kiểm tra ở cuối `scratch/seed-hrp-live-demo.sql`, phải trả 2 dòng có `slot_con_trong` lớn hơn 0. Chụp luôn `SELECT code, is_public FROM outsourcing_projects ORDER BY code` làm mốc đầu round cho `AC-12`. Chỉ chạy lại phần INSERT nếu query trả rỗng | Output 2 query (không kèm connection string) |
| `STEP-01` | Bỏ `badge` trong `ADMIN_NAV_PHASE4` và chỗ render; bỏ `brandSubtitle` ở `admin-shell.tsx`; dọn prop nếu không còn ai truyền | `git diff`; grep `badge:` trong file trả rỗng; grep `Nội bộ — Phase 4` toàn repo trả rỗng |
| `STEP-02` | Viết lại nội dung card `/admin` bằng mô tả nghiệp vụ; bỏ `module`/`narrative`/`moment` khỏi data và render; xoá khối tiến độ | `git diff`; grep `Phase 4`, `DEC-17`, `Moment`, `STEP-`, `AC-` trong `app/admin/page.tsx` trả rỗng |
| `STEP-03` | Tách `listError` (lỗi tải danh sách) và `actionError` (lỗi publish/unpublish). Bảng chỉ render hàng lỗi khi `listError`; `actionError` hiện ở banner phía trên và bị xoá ở đầu mỗi lần gọi hành động | `git diff`; mô tả 3 trường hợp: publish lỗi (bảng còn hàng), publish lại thành công (banner mất), GET lỗi (bảng báo lỗi) |
| `STEP-04` | Thêm `validTo: true` vào nested select `slots` của `listStaffingOrders` (`DEC-11`). Nạp `GET /api/staffing/orders` có phân trang theo `DEC-12`, gom slot trống theo `projectId` theo đúng `DEC-03`, thay `availableSlots: project.quota ?? 0`, đổi tiêu đề cột thành "Slot trống". Chưa có dữ liệu hoặc ngoài phạm vi phân trang thì render dấu gạch | `git diff` cả 2 file; trích đoạn hàm tính slot; render cho 1 dự án có order và 1 dự án không có order |
| `STEP-05` | Thêm ô `quota` (number, min 0) và `siteAddress` vào modal dự án; gửi đúng tên field; thêm dòng nhắc quota 0 | `git diff`; log network hoặc trích body gửi lên có 2 field |
| `STEP-06` | Thay input `projectId` bằng select nạp từ `GET /api/projects`; thêm `positionCode`, `hourlyRateVnd`, `shiftStart`, `shiftEnd`, `workLocation`, `deadlineDate`, `validTo`; bỏ hardcode `'GEN'` thành giá trị mặc định của ô nhập; field trống thì omit khỏi body | `git diff`; trích body gửi lên khi điền đủ và khi bỏ trống các field tuỳ chọn |
| `STEP-07` | `/admin/settings`: bỏ `href: '#'`, gắn nhãn "Chưa khả dụng", sửa subtitle | `git diff` |
| `STEP-08` | `rg "ADMIN_NAV\b"` xác nhận không import, rồi xoá export | Output grep trước khi xoá + `git diff` |
| `STEP-09` | Gate hồi quy: `npm run typecheck`, `npm run lint`, `npm run test:unit`; `npm run build` nếu môi trường cho phép; `git status --short` chứng minh không đụng file ngoài §4.2 | Lệnh + exit code + đuôi output |
| `STEP-10` | Vệ sinh: chạy lại `SELECT code, is_public FROM outsourcing_projects ORDER BY code` và so với mốc đầu round ở `STEP-00`; liệt kê mọi mã `DEMO` đã tạo và dán câu lệnh dọn tương ứng vào HANDOFF (chưa cần chạy dọn — Owner còn dùng dữ liệu này) | 2 output query đặt cạnh nhau + danh sách mã + câu lệnh dọn |

Thứ tự đề nghị: `STEP-00` → `STEP-01` → `STEP-02` → `STEP-03` → `STEP-04` (cùng file jobs, làm liền) → `STEP-05` → `STEP-06` → `STEP-07` → `STEP-08` → `STEP-09` → `STEP-10`.

**Stop condition** — dừng và báo Tier 1:

- Nếu sau khi áp `DEC-11` mà `GET /api/staffing/orders` vẫn không trả đủ `status`, `deadlineDate`, `slots[].validTo`, `slots[].slotsNeeded`, `slots[].slotsFilled`, `projectId` để tính slot trống: dừng, KHÔNG sửa thêm gì trong `src/domains/**` hay `app/api/**`.
- Nếu bỏ `brandSubtitle` làm vỡ layout dùng chung ở portal khác: dừng, báo trước khi đổi component chung.
- Nếu `npm run build` fail vì thiếu env/DB: ghi `ENV_BLOCKED` với log thật, không mock. Riêng `AC-03..AC-08` thì `ENV_BLOCKED` không còn được chấp nhận (`DEC-09`) — nếu không kết nối được DB thì dừng và báo Tier 1 ngay, đừng làm tiếp các STEP khác rồi mới nói.
- Nếu phát hiện trang admin nào khác cũng in chuỗi pipeline: ghi vào HANDOFF, không tự mở rộng scope.
- Nếu bất kỳ AC nào đòi phải xoá/sửa bản ghi không có prefix `DEMO`: dừng, đó là dấu hiệu cách đo sai.

## 6. Acceptance

| AC | Điều kiện | Cách đo | Owner |
|---|---|---|---|
| `AC-01` | Không còn badge module trên sidebar admin và không còn chuỗi "Nội bộ — Phase 4" ở đâu trong repo | grep `badge:` trong `role-guard-layout.tsx` rỗng; `rg "Nội bộ — Phase 4"` rỗng; render 1 trang admin | Tier 2 |
| `AC-02` | `rg -n "Phase 4|DEC-17|Moment|STEP-|AC-|narrative|module" app/admin/page.tsx` không còn match nào là text hiển thị | grep + trích render sau sửa | Tier 2 |
| `AC-03` | Publish lỗi: banner lỗi hiện ở trên, bảng vẫn còn đủ hàng dự án và nút Publish vẫn bấm được | Thao tác thật với 1 dự án không đủ điều kiện. API trả `400 INVALID_STATE` (v1.1 ghi `409` là **sai lời văn contract**, không phải lỗi code — đã sửa theo `DEV-04`; chuẩn hoá 400 hay 409 là follow-up riêng, không thuộc round này), ghi lại state UI | Tier 2 |
| `AC-04` | Publish lại thành công thì banner lỗi biến mất; nội dung banner có tên hoặc mã dự án lỗi | Thao tác thật 2 bước | Tier 2 |
| `AC-05` | Với dự án có order `OPEN` còn slot, cột "Slot trống" in đúng tổng `max(0, slotsNeeded - slotsFilled)` của các slot chưa hết hiệu lực; đối chiếu với dữ liệu order | So số trên UI với response `/api/staffing/orders` (đã có `validTo` sau `DEC-11`) | Tier 2 |
| `AC-06` | Với dự án không có order hợp lệ, hoặc dự án ngoài phạm vi phân trang, cột in dấu gạch (không phải `0` và không phải quota); `rg "project.quota" app/admin/jobs/page.tsx` rỗng; tiêu đề cột là "Slot trống" | Quan sát + grep | Tier 2 |
| `AC-07` | Tạo dự án qua UI với `quota` và `siteAddress` rồi `GET /api/projects` thấy 2 giá trị đúng như đã nhập | Thao tác thật + response | Tier 2 |
| `AC-08` | Tạo staffing order qua UI: chọn dự án từ select (không dán UUID), điền lương giờ + giờ + địa điểm + deadline, response `201`, và `GET /api/staffing/orders` trả đúng các giá trị đó | Thao tác thật + response | Tier 2 |
| `AC-09` | `/admin/settings` không còn `href: '#'`, mỗi nhóm có nhãn "Chưa khả dụng", subtitle không còn "Module M7" | grep + render | Tier 2 |
| `AC-10` | `rg "ADMIN_NAV\b"` chỉ còn `ADMIN_NAV_PHASE4`; app build được | grep + typecheck | Tier 2 |
| `AC-11` | `npm run typecheck`, `npm run lint`, `npm run test:unit` exit 0; `git status --short` không có file ngoài §4.2 (§4.2 v1.2 đã gồm 2 file `app/api/staffing/**` của `DEC-14`) và không file nào bị stage; `git diff --numstat -- src/domains/` in đúng `2 2 src/domains/staffing/order.service.ts` và 2 dòng đó đúng bằng `DEC-11` + `DEC-13`, không dòng thứ 3; `git diff -- app/api/staffing/` chỉ hiện helper `bigintSafe` cộng 3 chỗ `return NextResponse.json(...)`, không đổi status code, guard hay thứ tự nào | Log 3 lệnh + `git status --short` + 2 `git diff` | Tier 2 |
| `AC-12` | Trạng thái `is_public` cuối round bằng trạng thái đầu round, trừ đúng những thay đổi Tier 2 khai và giải thích; HANDOFF có bảng liệt kê mọi mã `DEMO` đã tạo kèm câu lệnh dọn; không bản ghi nào không phải `DEMO` bị sửa hay xoá | Chạy `SELECT code, is_public FROM outsourcing_projects ORDER BY code` ở đầu và cuối round rồi so 2 output | Tier 2 |

### Definition of Done

`AC-01..AC-08`, `AC-11` và `AC-12` PASS bằng evidence thật là điều kiện `READY_FOR_AUDIT`. `AC-09`, `AC-10` thuộc RQ `SHOULD`: nếu bỏ thì phải ghi lý do trong HANDOFF, không được im lặng.

`AC-03`, `AC-04`, `AC-05`, `AC-07`, `AC-08` cần thao tác trên môi trường có DB. Theo `DEC-09`, Owner đã xác nhận hệ thống còn ở giai đoạn dev nên **được** dựng dữ liệu `DEMO` trên DB đang phục vụ site và dọn sau; `ENV_BLOCKED` không còn là kết cục chấp nhận được cho 5 AC này. Ràng buộc kèm theo: chỉ thêm dữ liệu prefix `DEMO`, cấm sửa/xoá bản ghi khác, cấm tạo user/password/PII, cấm migration, cấm chạy `prisma/seed.mjs`, và cấm để lại dự án `is_public = true` (`DEC-10`).

## 7. Risk và Rollback

| ID | Risk | Mức | Xử lý |
|---|---|---|---|
| `RISK-01` | `role-guard-layout.tsx` là component dùng chung cho nhiều portal; bỏ prop có thể vỡ vendor/worker/ctv layout | Cao | `STEP-01` phải grep hết chỗ dùng trước khi bỏ prop; nếu portal khác còn dùng thì giữ prop, chỉ bỏ giá trị ở admin |
| `RISK-02` | Gọi thêm `/api/staffing/orders` ở `/admin/jobs` làm chậm trang hoặc trả payload lớn | Trung bình | Gọi song song với `/api/projects`, không chặn render bảng; nếu payload lớn thì dừng theo stop condition và bàn lại `DEC-04` |
| `RISK-03` | Sếp hiểu "Slots" là tổng slot của dự án, không phải slot trống | Thấp | Đặt tiêu đề cột rõ ("Slot trống") và tooltip ngắn |
| `RISK-04` | Working tree đang có thay đổi chưa commit của luồng khác (các `layout.tsx`) | Cao | Chỉ stage path trong §4.2; cấm `git add -A`; không reset/stash file luồng khác |
| `RISK-05` | Đổi text card `/admin` bị coi là "viết nội dung mới" vượt quyền Tier 2 | Thấp | Chỉ mô tả đúng chức năng trang đích, không sáng tác nội dung marketing; Tier 1 chấp nhận trước qua `DEC-02` |
| `RISK-06` | Thao tác `AC-07`/`AC-08` tạo rác dữ liệu | Trung bình | `DEC-09` cho phép nhưng buộc prefix `DEMO`; `RQ-11`/`AC-12` buộc liệt kê và kèm câu lệnh dọn |
| `RISK-07` | Bỏ lại một dự án `is_public = true` sau khi đo `AC-04` khiến job `DEMO` xuất hiện trên `/jobs` công khai trước khi Owner công bố link; hoặc ngược lại, Tier 2 unpublish mất dự án mà Owner vừa tự publish | Cao | `DEC-10` phân biệt rõ hai chiều; `AC-12` đo bằng cách so mốc đầu/cuối round chứ không đòi "phải rỗng"; slot demo `valid_to` chỉ 120 ngày nên cũng không tồn tại vô hạn |
| `RISK-08` | `DEC-11` + `DEC-13` mở cửa vào `src/domains/**` và `DEC-14` mở cửa vào `app/api/staffing/**`; Tier 2 nhân đà sửa thêm | Trung bình | `AC-11` v1.2 canh **đúng** 2 dòng trong `src/domains/` và **đúng** 3 chỗ `return` trong `app/api/staffing/`; Tier 3 kiểm 2 diff này trước mọi mandatory check khác, dòng nào vượt bound của `DEC-11`/`DEC-13`/`DEC-14` là FAIL |
| `RISK-10` | v1.2 là **amendment hậu kiểm**: contract được mở rộng sau khi code đã viết. Rủi ro hệ thống là biến "Owner uỷ quyền giữa lượt" thành đường vòng hợp thức hoá mọi deviation | Cao | Ba chốt: (1) Tier 1 đã tự đọc `git diff` của cả 3 file trước khi phê chuẩn, không phê chuẩn theo lời khai; (2) `DEC-13`/`DEC-14` ghi bound đúng tới từng ký tự và từng chỗ `return`, không phải "được sửa file này"; (3) `AC-11` biến bound đó thành phép đo mà Tier 3 chạy lại được. Deviation nào không có bound đo được thì phải revert, không phê chuẩn |
| `RISK-09` | Cột "Slot trống" báo thiếu vì phân trang không phủ hết order | Trung bình | `DEC-12` buộc phân trang tới `total` và in dấu gạch cho phần chưa phủ, cấm in `0` |

**Rollback:** `git revert` commit của task. Task đổi UI cộng một dòng select additive, không migration/env nên revert là đủ. Dữ liệu `DEMO` gỡ bằng block dọn ở cuối `scratch/seed-hrp-live-demo.sql`.

## 8. Open Questions

Không còn open question. `OQ-01` và `OQ-02` của v0.9 đã đóng thành `DEC-07` và `DEC-08`; cả hai đều giữ đúng default của v0.9 nên không đổi implementation của RQ nào.

Ba việc đã ghi nhận nhưng **cố ý** để ngoài scope round này, không phải câu hỏi treo: lệch quyền `EV-18`, gắn KPI thật cho `/admin` (`DEC-07`), và cột quota ở `/admin/jobs` (`DEC-08`).

## 9. Planner Resolution

Chưa có audit round nào. Mục này append-only sau khi Tier 3 nộp `AUDIT.md`.

### Amendment tiền-audit — round 1 execution, 2026-08-30

Không phải resolution của audit (Tier 3 chưa nộp gì). Đây là Tier 1 trả lời câu chặn của Tier 2 trong `HANDOFF.md` §5 để `/audit` chạy được trên một contract không tự mâu thuẫn.

Tier 1 tự đo trước khi phê chuẩn, không phê chuẩn theo lời khai: `git rev-parse HEAD` = `776a3c19a38757aee1a2b0d272def5140e2de196` (đúng baseline), `git diff --cached --numstat` rỗng (chưa stage gì), `git diff --numstat` in `2 2 src/domains/staffing/order.service.ts`, `12 2 app/api/staffing/orders/route.ts`, `10 1 app/api/staffing/orders/[id]/route.ts`, và `git diff` verbatim của cả 3 file khớp đúng những gì `DEV-01`/`DEV-02` khai.

- `DEV-01` (thiếu `)` sau `::bigint` trong `generateOrderCode`) → **phê chuẩn**, ghi thành `DEC-13`. Lỗi có từ `8c7fb91` nên `POST /api/staffing/orders` trả 42601 100% số lần kể từ lúc file sinh ra; revert là trả lại một endpoint chưa từng chạy được và làm `AC-08` không đo được.
- `DEV-02` (helper `bigintSafe` + 3 chỗ `return`) → **phê chuẩn**, ghi thành `DEC-14`. `slot.hourlyRateVnd` là `BigInt` nên response 500 **sau khi** transaction đã commit: người vận hành thấy lỗi, bấm lại, sinh đơn trùng. Đây là data-integrity defect, không phải việc cosmetic để defer.
- `DEV-03`/`DEV-04`/`DEV-05` → **nhận, không revert**, ghi thành `DEC-15`. `DEV-04` là lỗi chữ của contract v1.1: `AC-03` viết `(kỳ vọng 409)` trong khi code trả `400 INVALID_STATE`; v1.2 sửa `AC-03` về `400`. Chuẩn hoá 400 so với 409 toàn app là follow-up riêng, không nhét vào round này.
- `AC-11` và `RISK-08` được viết lại để đo đúng bound của `DEC-11`/`DEC-13`/`DEC-14` thay vì mệnh đề "đúng một dòng" đã sai; thêm `RISK-10` để amendment hậu kiểm không thành tiền lệ.
- `FUP-01` (10 trang admin còn in nhãn `Module M...`, gồm `/admin/staffing`), `FUP-02` (lệch quyền `EV-18`), `FUP-03` (ma trận RLS thiếu trên `hrp-live`), `FUP-04` (unit test mock raw SQL nên không bắt được 42601) **không** mở lại round 1 và **không** nhét vào task 04. Cả bốn vào backlog ở `docs/PLANNER_HANDOVER.md` §0. `FUP-03` phải là task riêng vì bản chất công việc và quyền hạn khác task 04: nó cần re-apply migration trên DB thật (quyền OP của Owner), còn task 04 là bản vá tầng app không cần migration.
- SQL dọn dữ liệu `DEMO` mà Tier 2 dán ở §5: **chưa chạy**, và chỉ chạy **sau** khi Tier 3 ra verdict — Tier 3 cần `DA-DEMO-003` và `SO-00001..3` còn sống để đo lại `AC-05..AC-08`. Người chạy là Owner trong Neon Console SQL Editor vì policy RESTRICTIVE `no_delete` chặn DELETE của mọi app role. Một lỗi trong cách dùng SQL đó cần sửa khi chạy: dán cả khối `BEGIN ... COMMIT` một lần thì hai câu `SELECT` kiểm tra không thực sự gate được gì — chạy `SELECT` trước, đọc kết quả, rồi mới chạy khối `DELETE`.

### Audit round 1 — TỪ CHỐI LÀM EVIDENCE, mở audit round 2, 2026-08-30

Tier 3 đã nộp `AUDIT.md` (5430 byte, verdict `PASS`, 12/12 AC ghi `PASS`) và commit `473f26b` gồm đúng một file `AUDIT.md` của mình, không đụng code. Tier 1 **không** `/resolve` trên bản này. Ba việc tách bạch:

**(1) `verify-audit.ps1` exit 2 là lỗi của Tier 1, không phải của Tier 3.** Gate in một dòng `[FAIL] ... has no verdict row in AUDIT section 2` cho một mã AC **không tồn tại** trong §6. Contract này chỉ định nghĩa `AC-01..AC-12` và Tier 3 phủ đủ 12. Mã mà gate đòi xuất hiện trong contract **chỉ** ở hai câu văn trích lại chuỗi UI mà task này đi xoá (§1 và `EV-06`); đó là mã pipeline của một round khác, không phải AC của contract này. Gate quét mã AC trên toàn file nên đọc chuỗi trích dẫn thành AC thật. v1.3 sửa hai câu đó thành lời văn không chứa mã, **không nới một AC nào, không đổi cách đo nào**. Tier 3 không phải chịu trách nhiệm cho lần FAIL này.

**(2) `AUDIT.md` round 1 không đạt Iron Rule 4 — "Evidence must be REAL (command + exit code + output). Mock evidence = block."** Bốn chỗ, dẫn nguyên văn:

- `C-01` ghi `npm run test:unit` xanh **"(giả định, theo Handoff v1.2)"**. Một mandatory check ghi rõ là suy đoán thì bằng không có check. Kết quả đúng (Tier 1 đã đo, xem mục 3) nhưng đó là do may, không do audit.
- `C-02` `"Build không lỗi"`, `C-05..C-10` toàn bộ là lời văn: không lệnh, không exit code, không output. `C-07` còn ghi `"Lịch sử commit sạch sẽ, đúng baseline"` trong khi code round 1 **chưa commit dòng nào** — câu đó không tương ứng với trạng thái repo.
- §4 Independent Evidence chỉ có **2 dòng**, cả hai là `git diff`, cột evidence path ghi `"Console Output"` (không phải đường dẫn). Đây là toàn bộ phần đo độc lập của một `CODE_AUDIT` 12 AC.
- Năm AC hành vi `AC-03`, `AC-04`, `AC-07`, `AC-08` và `AC-12` được kết luận bằng lời văn (`"Trạng thái update tốt"`, `"API và UI khớp nhau"`, `"POST 201 trả về đúng dữ liệu"`, `"Handoff có đủ report và script dọn dẹp"`). `AC-12` quy định cách đo là chạy `SELECT code, is_public FROM outsourcing_projects ORDER BY code` rồi so hai output — không có output nào trong `AUDIT.md`. Kiểm tra rằng HANDOFF **có** một bảng không phải là kiểm tra độc lập trạng thái dữ liệu.

**(3) Tier 1 tự đo lại: code lành, artifact không lành.** Lệnh Tier 1 chạy trong lượt này, đều exit 0: `npm run typecheck`; `npm run lint` (0 error, 492 warning tồn dư); `npm run test:unit` (91 file, 1408 test pass). Bốn phép đo tĩnh của `AC-01`, `AC-02`, `AC-09`, `AC-10` đều rỗng thật khi Tier 1 tự grep. `AC-11` khớp từng số: index rỗng; `git diff --numstat -- src/domains/` in đúng `2 2 src/domains/staffing/order.service.ts` và đúng hai dòng của `DEC-11` + `DEC-13`; `git diff --numstat -- app/api/staffing/` in `10 1` và `12 2`; `git status --short` có đúng 10 file code, tất cả nằm trong §4.2. Vậy defect nằm ở **bản audit**, không ở code — lặp lại đúng vết của go-live-02, nơi Tier 1 phải tự đo lại 8 AC.

**Điều kiện đóng audit round 2 (Tier 3, không cần Tier 2 làm lại code):** mỗi dòng của §2 và mỗi dòng `C-01..C-10` phải kèm lệnh thật + exit code + đuôi output; `C-01`/`C-02` phải là Tier 3 tự chạy, cấm chữ "giả định"; năm AC hành vi phải có response hoặc trạng thái UI thật đo trên dữ liệu `DEMO` còn sống (`DA-DEMO-003`, `SO-00001..3` vẫn chưa dọn, cố ý); `AC-12` phải dán output query đầu và cuối. `FUP-01..FUP-04` vẫn ở backlog, **không** mở lại — đặc biệt `FUP-01`: 10 trang admin còn in nhãn `Module M...` (gồm `/admin/staffing` và `/admin/projects`) đã được Tier 1 kiểm lại trong lượt này và xác nhận nằm ngoài `AC-01`/`AC-02` (hai AC đó bound vào `role-guard-layout.tsx`, chuỗi "Nội bộ — Phase 4" và riêng `app/admin/page.tsx`), nên đó **không** phải lỗi bỏ sót của Tier 3.

### Audit round 2 — PASS, Tier 1 kết luận `ACCEPTED`, 2026-08-30

Tier 3 nộp lại `AUDIT.md` tại commit `c0d51e1`, ghi đúng Spec version `v1.3` và sửa hai mâu thuẫn evidence của bản trước: `AC-03` đo được `400 INVALID_STATE`; `AC-05` đo được `DA-DEMO-003=10`, `DA-DEMO-001=10`, `DA-DEMO-002=5`.

Tier 1 chạy lại gate độc lập bằng lệnh:

```powershell
.ai-pipeline\scripts\verify-audit.ps1 `
  -TaskPath docs\tasks\hrp-v5-go-live-03-admin-surface-truth\TASK.md `
  -AuditPath docs\tasks\hrp-v5-go-live-03-admin-surface-truth\AUDIT.md
```

Kết quả: `RESULT: PASS. AUDIT.md has enough evidence for Tier 1 to resolve`, exit `0`.

Quyết định:

- `AC-01..AC-12`: `ACCEPTED` theo Audit Round 2.
- `DEV-01..DEV-05`: giữ nguyên theo `DEC-13..DEC-15`; không mở execution round mới.
- `FUP-01..FUP-04`: giữ trong backlog Living Handoff; không làm chậm việc đóng task này.
- Mười file source đúng scope §4.2 đã được Tier 1 commit path-scoped tại `7024910`; không gồm `public/index.html`, task 02, `aff_plan*`, `scratch/*` hay artifact của task kế tiếp.
- Task đóng ở `ACCEPTED`; source thay đổi sau mốc `7024910` phải mở task/round mới và audit lại.

Execution stream tiếp theo được nhả cho `hrp-v5-go-live-04-public-read-rls-closure`.

## 10. Revision Log

| Version | Ngày | Thay đổi |
|---|---|---|
| v0.9 | 2026-08-29 | Tạo contract `DRAFT` từ kiểm kê 16 trang admin (`EV-14`) và evidence `EV-01..EV-13`; xếp hàng sau task 02 |
| v1.0 | 2026-08-29 | `READY_FOR_EXECUTION`. Khoá baseline `776a3c1`. Đóng `OQ-01`/`OQ-02` thành `DEC-07`/`DEC-08`. Thêm `EV-15..EV-21`: bảng dự án không in UUID nên `RQ-07` là ngõ chết thật; `listStaffingOrders` thiếu `slot.validTo` nên `DEC-03` không tính được — giải bằng `DEC-11` (một dòng select additive, mở `src/domains/staffing/order.service.ts` vào §4.2 với giới hạn hẹp và `AC-11` canh diff); `take` bị chặn 50 nên thêm `DEC-12` phân trang và cấm in `0`. Ghi uỷ quyền dev-seed của Owner thành `DEC-09` (bỏ `ENV_BLOCKED` cho `AC-03..AC-08`), thêm `DEC-10` cấm để lại `is_public = true`, thêm `RQ-11`/`STEP-00`/`STEP-10`/`AC-12` cho vệ sinh dữ liệu, `INV-06`, `RISK-07..09`, và đưa lệch quyền `EV-18` vào non-goal |
| v1.1 | 2026-08-29 | Owner đã chạy seed thật trên `hrp-live` (`EV-21`) và Tier 1 đo lại bề mặt công khai vẫn `total: 0` (`EV-22`), nên `STEP-00` chuyển từ "dựng dữ liệu" thành "xác nhận dữ liệu + chụp mốc đầu round". Sửa cách đo `AC-12`: Owner được quyền tự publish dự án `DEMO` (đó là việc OP của Owner), nên `DEC-10` phân biệt hai chiều và `AC-12` so mốc đầu/cuối round thay vì đòi query `is_public = TRUE` trả rỗng — cách đo cũ sẽ FAIL oan hoặc đẩy Tier 2 tới chỗ unpublish mất job của Owner. Thêm `EV-23`: cột Slots gán `project.quota` cho **cả hai** vế `availableSlots`/`totalNeeded` nên in cùng một số hai lần, `RQ-05` phải sửa cả hai |
| v1.2 | 2026-08-30 | Amendment tiền-audit round 1, chi tiết ở §9. Phê chuẩn 2 deviation Owner uỷ quyền giữa lượt sau khi Tier 1 tự đọc diff cả 3 file: `DEC-13` (một ký tự `)` sửa 42601 làm `POST /api/staffing/orders` chưa từng chạy được kể từ `8c7fb91`) và `DEC-14` (helper `bigintSafe` + 3 chỗ `return` sửa 500-sau-commit gây đơn trùng vì `hourlyRateVnd` là `BigInt`); `DEC-15` nhận `DEV-03..DEV-05` không revert. §4.2 và `RQ-10` mở đúng 2 file `app/api/staffing/**`. `AC-03` sửa lỗi chữ của v1.1: `409` → `400 INVALID_STATE`. `AC-11` viết lại thành phép đo bound (`git diff --numstat -- src/domains/` = `2 2` với đúng 2 dòng đã nêu tên, và diff `app/api/staffing/` chỉ có helper + 3 `return`) thay cho mệnh đề "đúng một dòng" đã sai; `RISK-08` chỉnh theo, thêm `RISK-10` chặn amendment hậu kiểm thành tiền lệ. `FUP-01..FUP-04` đẩy sang backlog `PLANNER_HANDOVER.md` §0, không mở lại round 1, không nhét vào task 04. SQL dọn `DEMO` chỉ chạy sau verdict của Tier 3 |
| v1.3 | 2026-08-30 | Từ chối audit round 1 làm evidence và mở audit round 2 (§9). Chỉ hai loại thay đổi: (a) hai câu văn ở §1 và `EV-06` trích chuỗi UI có mã pipeline được viết lại thành lời văn không chứa mã, vì `verify-audit.ps1` quét mã AC trên toàn file nên đọc chuỗi trích dẫn thành AC thật và FAIL oan — **không nới AC nào, không đổi cách đo nào, không thêm hay bớt RQ, STEP, DEC, AC**; (b) Control chuyển `Current audit round` sang `2`, giữ `Current execution round` bằng `1` vì code round 1 không phải chỗ lỗi. `FUP-01` được kiểm lại và giữ ở backlog: 10 trang admin còn nhãn `Module M...` nằm ngoài bound của `AC-01`/`AC-02`, không phải lỗi bỏ sót của Tier 3 |
