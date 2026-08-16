# HANDOFF: hrp-v4-bod-mockup

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v4-bod-mockup` |
| Work type | `DESIGN` |
| Spec version | `v1.12` (khớp TASK.md) |
| Execution round | `4` |
| Executor | `Tier 1 Planner + ui-ux-pro-max skill (founder ủy quyền 15/08/2026 — thay sếp làm phần Figma; DEC-27: medium HTML)` |
| Baseline | `git a4327ab` · thực tế ngày 15/08/2026 · `docs/UNIFIED_PLAN_v4.md` (v4.20), `stitch/warm_professionalism/DESIGN.md` (G27), `docs/HRP_V4_MOCKUP_EXECUTION_PLAN.md` (PDD) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | `2026-08-15 (VN)` — STEP-01 08:40 → STEP-06 21:10 → STEP-08 (phần tự chủ) 23:30 cùng ngày · `2026-08-16 (VN)` — STEP-10 (DEC-33, bộ công cụ diễn thuyết tiếng Việt) |

## 1. Outcome Summary

Đã dựng xong **22/22 frame low-fi** của flow chính (STEP-01/02/03) theo DEC-27 — medium HTML/CSS prototype, mỗi frame = 1 file tự chứa trong `mockup/`, artboard 1440×900 tự scale theo cửa sổ (frame.js), mở `mockup/index.html` là bản đồ 10 nhóm.

- **STEP-01** (foundations): `_assets/hrp.css` — tokens canonical G27 "Warm Professionalism" (primary `#F26522`, dark `#A63B00`, Be Vietnam Pro + Inter), app shell (sidebar 232 / topbar 56 / gutter 24 / radius 6 / drawer 480 / z-scale 10-40-50-60 / motion 150-250ms), toàn bộ component class dùng chung (button, badge icon+text, KPI band, table 44px, drawer, dialog, banner, chip, seg, queue, timeline, skeleton, empty, form, tabs, portal). `frame.js` chèn labelbar (link về index.html + tên frame + 1440×900) và scale-to-fit. `F00_Cover` + `F01_Tokens/TypeSpacing/StatusLanguage/Density_Variant_44_52`.
- **STEP-02** (low-fi, 7 frame): `S01_ControlTower_Default_1440` (KPI band phẳng 4 số + queue 4 mục + 2 chart + project table 3 dòng + 2 dòng ẩn), `S02_Staffing_Default_1440` (12 worker card + filter + seg Grid/Compact + phân trang 128), `S02A_AssignmentConflict_Drawer` + `S02A_TransferPreview` (guided transfer 1-ACTIVE), `S02B_ReferralGuard_Drawer_Protected` + `S02B_ReferralGuard_OverrideRequested` (timeline 3 sự kiện + kết luận + override form), `F00A_DemoNarrative` (click-path 16 bước PDD §1.3 + 3 khoảnh khắc bắt buộc §1.4).
- **STEP-03** (low-fi, 10 frame): `S03_Attendance_Exceptions` (stats band 5 số, bảng 7 exception đúng taxonomy ×1, blocker trước, bulk bar, readiness 5/7), `S03_ResolveDrawer` (3 band raw/suggested/result — AP-QM-1048 → Mai), `S03_Attendance_Resolved` (7/7 · maker Lê Thu Hà / checker Nguyễn Thanh Huyền), `S03B_LockConfirmation` (dialog đúng 7 số §5.6, primary không màu success), `S03_Attendance_Locked_ReadOnly` (bất biến + adjustment path), `S04_Reconciliation_Internal` (summary band 3 số + tabs + vendor/client split cùng file anchor), `S04_MarginComparison` (3 dự án + tổng kỳ), `S04A_Lineage_Drawer` (chain + phép tính Long đầy đủ), `S04B_VendorPreview_Sent` (portal đối tác, ẩn client rate/margin/salary, deadline 18/08 18:00), `S04B_VendorPreview_DisputeForm` (phạm vi + lý do danh mục + mô tả + bằng chứng + deadline).
- **Low-fi mode**: class `.wf` trên `.frame-canvas` chuyển toàn bộ token về xám + viền đứt; STEP-05 gỡ `.wf` là có hi-fi (không sửa nội dung).
- **STEP-05 (hi-fi + components)**: gỡ toàn bộ `.wf` low-fi; áp radius G27 8/16/24 (AUD-003); pass cleanup inline (AUD-004): `.icon-btn` position:relative, class `.tbl-sub-block`, badge `HI-FI · STEP-05` mọi frame; `F02_ComponentSet` — 17 component PDD §8.2 dùng class chung hrp.css (không detach, không inline override); RightDrawer/ConfirmationDialog link tới frame live S02A/S03B (tránh nested).
- **STEP-06 (hi-fi S03/S04 + 12 state + wire 11 hotspot)**: hi-fi Attendance/Reconciliation; 12 state frame đúng tên §4.5 — overlay (S01_Loading, S03_ImportProgress, S03_ImportFailed: scrim + state-card + skeleton/progress), in-place (S01_EmptyQueue, S01_StaleBanner, S02B_Expired, S02_CardBlocked, S04_ConfirmedLocked, S04_RevisionV2, S04_VendorDisputed), st-hide (S02_Staffing_NoResult, S04_EmptyPayment); mỗi state có badge `STATE · …` màu semantic + note trung thực `(State minh họa STEP-06 · AC-11)` + link quay về frame gốc. `F50_HotspotMap` — bảng 11 hotspot PDD §8.3 (from → to → back-path) + deviation Long/Nam ghi rõ.
- **Wire & verify**: 11 hotspot link đúng đích; back-path bổ sung — S04B_VendorPreview_Sent thêm nút `Về HRP` → S04; sidebar `Dự án` 3 frame S03 trỏ → S02 (trước là `#`); link-check toàn bộ 36 frame: ALL OK (script bỏ anchor + http + assets).
- **STEP-08 (phần tự chủ — round 3, chuẩn bị demo BoD)**:
  - **Trang 60** `F60_D01.html`…`F60_D08.html` + `F60_D09_D12_Notes.html` — mỗi D01–D08 1 file: bối cảnh + recommendation (variant A — assumption đang demo) + variant A/B so sánh + mức chặn nếu BoD chọn khác + ô ghi chú BoD chờ buổi họp; header mọi file ghi rõ "Prototype assumption — không phải quyết định final của BoD (PDD §10.2)"; chip nav D01→D09–D12 + back-link bản đồ.
  - **`DECISION_LOG.md`** — bảng D01–D08 (recommendation, variants, áp dụng, owner Sếp, due buổi BoD, mức chặn) + D09–D12 deferred (owner + due đề xuất; D12 brand ẩn danh đang áp dụng từ đầu) + checklist sau buổi họp (chốt chọn → Archive trang 90 → freeze chỉ sau PM/BoD ký).
  - **Export dự phòng** `F80_DemoExport.html` — 16 bước đúng thứ tự F00A (00:00→13:00), mỗi bước: thời gian + link frame + hành động + lời dẫn; 3 khoảnh khắc bắt buộc (Guided Transfer 02:10–03:10 · Exception→Lock 06:20–08:30 · Dual Reconciliation 09:30–13:00) tô viền cam theo RISK-03 fallback 7 phút; print CSS mỗi bước 1 trang → `F80_DemoExport.pdf` (4,8MB) đã in bằng Chrome headless (DEC-27 browser print).
  - **index.html**: nhóm 60 → 4 dòng done (D01–D04, D05–D08, D09–D12 Notes, Decision Log) + nhóm 80 mới (F80 done); F90 Archive giữ todo (chờ kết quả buổi BoD).
- **Chưa hoàn thành (đúng kế hoạch)**: 2 dry-run ≤15 phút cần **sếp làm presenter** (AC-12 — evidence video/log); freeze Mockup Baseline v1 chỉ sau PM/BoD ký (không freeze sớm); STEP-09 (S05). Không tự ghi audit verdict.
- **STEP-10 (round 4 — bộ công cụ diễn thuyết tiếng Việt, DEC-33)**:
  - **`F01B_Glossary.html`** (mới) — frame từ điển thuật ngữ EN → VI, style bắt chước F01_StatusLanguage (tokens G27 hrp.css, Be Vietnam Pro + Inter, watermark `DỮ LIỆU MINH HỌA` có dấu), title "F01B — Glossary thuật ngữ EN → VI" + note "DEC-33 — UI các frame giữ nguyên thuật ngữ tiếng Anh chuẩn ngành". **21 thuật ngữ đúng theo DEC-33**, 4 nhóm module (Bảng điều hành S01 3 · Bố trí nhân sự S02 5 · Chuyên cần S03 6 · Đối soát S04 7), mỗi dòng "EN → VI — nghĩa + ví dụ ngắn", không thêm bớt nghĩa.
  - **`F00A_DemoNarrative.html`** (cập nhật) — cả **16 bước** giữ nguyên lời thoại gốc (cột `.say-orig`), thêm **bản diễn đạt tiếng Việt dễ nói** (thẻ `VI`, dòng `.say-vi`, dùng từ Việt hóa kèm EN trong ngoặc lần đầu). Không đổi thời gian/thứ tự/click-path/file đích bất kỳ bước nào. Header thêm ghi chú "Lời thoại Việt bổ sung theo DEC-33" + link mở `F01B_Glossary`; legend thêm thẻ `VI`.
  - **`PRESENTER_GUIDE.md`** (mới, task folder) — đủ 3 phần: (a) bảng 21 thuật ngữ EN→VI (nguồn DEC-33); (b) 3 mẹo diễn thuyết 15 phút (mở sẵn F01B tab riêng tham khảo — **glossary không tính vào 15 phút dry-run**; gặp thuật ngữ EN thì nói "tức là…" + nghĩa Việt; dừng lại ở 3 khoảnh khắc tô cam trong F80 để sếp hỏi); (c) nhắc 11 hotspot đúng trình tự F00A + demo ≤15 phút + không submit thật ở 03:10/12:10 + fallback PDF.
  - **`mockup/index.html`** (cập nhật) — nhóm 01 Foundations thêm dòng `F01B_Glossary.html` (done, mô tả "Từ điển thuật ngữ EN→VI — DEC-33").
  - **KHÔNG sửa 30 frame màn hình khác** — UI giữ nguyên thuật ngữ EN chuẩn ngành (DEC-33).

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-07`, `RQ-09` | `mockup/index.html`, `mockup/_assets/hrp.css`, `mockup/_assets/frame.js`, `mockup/F00_Cover.html`, `mockup/F01_Tokens.html`, `mockup/F01_TypeSpacing.html`, `mockup/F01_StatusLanguage.html`, `mockup/F01_Density_Variant_44_52.html` | DONE | None — DEC-27 đã chuyển medium từ Figma sang HTML |
| `STEP-02` | `RQ-01`, `RQ-02`, `RQ-03`, `RQ-04`, `RQ-07` | `mockup/S01_ControlTower_Default_1440.html`, `mockup/S02_Staffing_Default_1440.html`, `mockup/S02A_AssignmentConflict_Drawer.html`, `mockup/S02A_TransferPreview.html`, `mockup/S02B_ReferralGuard_Drawer_Protected.html`, `mockup/S02B_ReferralGuard_OverrideRequested.html`, `mockup/F00A_DemoNarrative.html` | DONE | (a) Drawer frame dựng trên underlying truncated 3 card + note trung thực "bị scrim làm mờ" thay vì duplicate cả 12 card (file tự chứa, PDD §4.4); (b) F00A là trang presenter — không low-fi (không có app shell để gray-out) |
| `STEP-03` | `RQ-01`, `RQ-02`, `RQ-05`, `RQ-06`, `RQ-07` | `mockup/S03_Attendance_Exceptions.html`, `mockup/S03_ResolveDrawer.html`, `mockup/S03_Attendance_Resolved.html`, `mockup/S03B_LockConfirmation.html`, `mockup/S03_Attendance_Locked_ReadOnly.html`, `mockup/S04_Reconciliation_Internal.html`, `mockup/S04_MarginComparison.html`, `mockup/S04A_Lineage_Drawer.html`, `mockup/S04B_VendorPreview_Sent.html`, `mockup/S04B_VendorPreview_DisputeForm.html` | DONE | (a) Tab "Client receivable" nằm trong cùng file S04_Reconciliation_Internal (anchor `#client`) — frame inventory §4.5 không có file ClientReceivable riêng; (b) bulk "Đánh dấu đã xử lý" là link fast-path → S03_Attendance_Resolved (không phải hotspot chính thức §8.3); (c) dialog lock giữ "Khóa và tạo đối soát" màu primary — không màu success — đúng PDD §5.6 |
| `STEP-05` | `RQ-07`, `RQ-08`, `RQ-09` | `mockup/F02_ComponentSet.html`, hi-fi toàn bộ 22 frame (gỡ `.wf`, radius 8/16/24, badge HI-FI) | DONE | (a) Radius 8/16/24 theo DEC-28 — ghi chú ở F02 callout; (b) RightDrawer/ConfirmationDialog không dựng lại trong F02 — link tới S02A/S03B live (tránh nested) |
| `STEP-06` | `RQ-02`, `RQ-08`, `RQ-10` | `mockup/F50_HotspotMap.html`, 12 state frame (`S01_ControlTower_Loading/EmptyQueue/StaleBanner`, `S02_Staffing_NoResult`, `S02B_ReferralGuard_Expired`, `S02_CardBlocked`, `S03_ImportProgress/ImportFailed`, `S04_VendorDisputed/ConfirmedLocked/RevisionV2/EmptyPayment`), `mockup/index.html` (14 dòng done), `F00A_DemoNarrative` foot | DONE | (a) PDD §8.3 hotspot #9 ghi "Nguyễn Văn Nam" — §4.5 locked scenario (audit round 1) dùng dòng Bùi Đức Long cho lineage: giữ Long, ghi deviation trong F50; (b) S04B_VendorPreview_Sent thiếu back-path → thêm nút "Về HRP" → S04; (c) sidebar Dự án S03×3 trỏ S02; (d) S02_CardBlocked note chuẩn hóa mẫu audit |
| `STEP-08` (phần tự chủ) | `RQ-11`, `AC-12`, `AC-13` | `mockup/F60_D01.html`…`F60_D08.html`, `mockup/F60_D09_D12_Notes.html`, `DECISION_LOG.md`, `mockup/F80_DemoExport.html` + `F80_DemoExport.pdf`, `mockup/index.html` (nhóm 60 done + nhóm 80) | DONE | (a) 2 dry-run chưa chạy — cần sếp làm presenter (không thuộc phần tự chủ); (b) PDF in bằng Chrome headless (DEC-27 ghi "browser print" — Edge headless không xuất file, đã chuyển Chrome); (c) variant B của D01/D05/D07/D08 do Planner định nghĩa thay thế hợp lý (TASK chỉ ghi variant A được chọn) — ghi rõ là option để BoD cân nhắc, không phải yêu cầu cũ của contract |
| `STEP-10` | `RQ-14` | `mockup/F01B_Glossary.html` (mới), `mockup/F00A_DemoNarrative.html` (lời thoại Việt 16 bước), `PRESENTER_GUIDE.md` (mới), `mockup/index.html` (dòng F01B nhóm 01), `HANDOFF.md` (round 4) | DONE | (a) F01B dùng đúng 21 thuật ngữ + nghĩa theo DEC-33, không thêm nghĩa/ví dụ mới cho mục không có sẵn; (b) Lời thoại Việt F00A là diễn đạt dễ nói (kèm EN lần đầu) — không dịch nguyên văn, giữ lời thoại gốc bên cạnh; (c) không đổi thời gian/thứ tự/click-path/file đích F00A; không sửa 30 frame màn hình |

## 3. Acceptance Evidence

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| `AC-01` | Mở `mockup/index.html`, bấm theo click-path PDD §1.3 (16 bước trong F00A) | PASS (walkthrough link) | `mockup/F00A_DemoNarrative.html` — từng bước có link đúng frame; KPI/queue S01 → S02/S03/S04 | Chưa dry-run thật (STEP-08) |
| `AC-02` | Cộng tay mọi validation rule §4.4 | PASS | 914.820.000−728.460.000=186.360.000 ✓ 20,37%; Long 13.108.000/16.272.000/3.164.000 ✓ (S04+S04A); Khánh 12.064.000/14.976.000 ✓; Mai 5.568.000/6.912.000 ✓; 426,5+48,0+16,0=490,5 ✓ (S03 band); 1.222−1.215=7 ✓ | 44 dòng ẩn gộp S04 — TASK v1.4 đã sửa text "43"→"44" (47−3) |
| `AC-03` | Grep toàn bộ frame | PASS | ID worker/project/vendor giữ nguyên giữa frame; tiền vi-VN nguyên đồng; watermark `DỮ LIỆU MINH HỌA` trên topbar mọi frame app-shell; không SĐT/CCCD/bank/lương trên card | Không có PII thật trong dữ liệu mock |
| `AC-04` | Đối chiếu index.html với §4.5 | PASS | Không frame Payroll/TNCN/BHXH/Worker Portal/CRM; S05 chưa dựng (STEP-09) nên chưa có trong flow | S05 sẽ thêm sau |
| `AC-05` | Visual | PASS (hi-fi) | S02 dùng card 12 (WorkerCard ×5 variant trong F02); S03/S04 dùng table | — |
| `AC-06` | Bấm S02 Nam → Bố trí | PASS | `S02A_AssignmentConflict_Drawer.html` (guided: Xem assignment / Chuyển dự án — không toast lỗi) → `S02A_TransferPreview.html` (đóng cũ ACTIVE→TRANSFERRED 15/08 06:00, mở mới PLANNED→ACTIVE 15/08 06:00, quota 80→79 / 47→48, lý do bắt buộc) | — |
| `AC-07` | Bấm S02 Huy → nguồn tuyển | PASS | `S02B_ReferralGuard_Drawer_Protected.html` (timeline 12/08·12/08·15/08, kết luận `Chặn nhận nguồn mới đến hết 18/08`, lý do `Claim CTV đang trong cửa sổ bảo vệ 7 ngày`, badge `còn 3 ngày`) → `S02B_ReferralGuard_OverrideRequested.html` (lý do + bằng chứng bắt buộc, maker-checker) | Override form chỉ hiện sau khi bấm Yêu cầu override (demo path) |
| `AC-08` | Bấm flow 06:20–08:30 | PASS | S03 default (5/7 · Còn 2 blocker) → S03_ResolveDrawer (gán Mai) → S03_Attendance_Resolved (7/7 · maker/checker) → S03B_LockConfirmation (1.222 raw · 0 blocker · 7 đã xử lý · 9.624h · 490,5h OT) → S03_Attendance_Locked_ReadOnly | Không có animation state — đi bằng link giữa frame |
| `AC-09` | Đối chiếu bảng S03 với §4.4 | PASS | 7 taxonomy đúng 1 lần: UNMATCHED/SOURCE_CONFLICT/WRONG_PROJECT/CROSS_DAY_SHIFT/MISSING_CHECKOUT/DUPLICATE_EVENT/INACTIVE_ASSIGNMENT; blocker row 1+2; 2 row chưa map = AP-QM-1048 (badge Chưa map) + AP-QM-1128 (badge Chưa map assignment) | WRONG_PROJECT = blocker-class (DEC-09) nhưng đã xử lý trong demo state (DEC-18 + §4.4 line 202 canonical) |
| `AC-10` | Mở frame ở 1366×768 | PASS (kiến trúc) | frame.js scale-to-fit toàn bộ artboard — không che CTA vì cả màn hiển thị; badge đều icon+text; không gradient/nested card/emoji icon/hero-scale | Chưa chụp screenshot 2 viewport — Tier 3 round 2 kiểm tra (1366×768) |
| `AC-11` | Page tree | PASS | 12/12 state frame §4.5 + badge STATE + note trung thực + back-link (grep từng file) | F50 ghi deviation hotspot #9 (Nam→Long) |
| `AC-12` | Dry-run 2 lần ≤15 phút | PARTIAL | Sẵn sàng về tài liệu: F00A_DemoNarrative (16 bước) + F80_DemoExport HTML/PDF (đúng thứ tự, RISK-03 fallback 7 phút) + link-check OK; **chưa chạy dry-run thật — cần sếp làm presenter, evidence video/log sau khi chạy** | 2 dry-run thuộc sếp — không tự chạy |
| `AC-13` | Trang 60 + Decision Log | PASS | `F60_D01`…`F60_D08` (variant + recommendation + mức chặn từng D) + `F60_D09_D12_Notes` (D09–D12 owner+due) + `DECISION_LOG.md` (D01–D12 đủ owner+due theo RQ-11) | Kết quả chọn của BoD ghi sau buổi họp |
| `AC-14` | Đọc HANDOFF + AUDIT + TASK §9 | PARTIAL | HANDOFF.md (round 1+2+3) ✓; AUDIT.md round 1+2 đã có + §9 resolution ✓; chờ Tier 3 append round 3 | — |
| `AC-15` | S05 | NOT YET | STEP-09 | — |
| `AC-16` | Đọc 3 file + link-check (STEP-10, DEC-33) | PASS | `mockup/F01B_Glossary.html` — 21 thuật ngữ EN→VI (≥15), mỗi dòng "EN → VI — nghĩa 1 dòng + ví dụ ngắn", nhóm 4 module S01–S04, watermark có dấu, tokens G27 (render check class/token tồn tại trong hrp.css); `mockup/index.html` có dòng F01B nhóm 01 (done); `F00A_DemoNarrative.html` — đủ 16/16 lời thoại có bản diễn đạt Việt (thẻ `VI`), thời gian/thứ tự/click-path không đổi; `PRESENTER_GUIDE.md` tồn tại đủ 3 phần (thuật ngữ + 3 mẹo 15 phút + quy ước glossary ngoài giờ dry-run + nhắc 11 hotspot); link-check: index→F01B OK, F01B→F00A/PRESENTER_GUIDE OK, F00A→F01B OK, không đổi link nào của 16 bước | UI 30 frame không bị Việt hóa (chỉ sửa 5 file: F01B, F00A, PRESENTER_GUIDE, index, HANDOFF) |

## 4. Changed Deliverables

- **Source/artifact changed:** `docs/tasks/hrp-v4-bod-mockup/mockup/index.html`, `mockup/_assets/hrp.css`, `mockup/_assets/frame.js`, 22 file frame (liệt kê §2), `docs/tasks/hrp-v4-bod-mockup/TASK.md` (v1.4 — sửa lỗi số học §4.4: 44 dòng ẩn gộp, thêm Revision Log), `docs/tasks/hrp-v4-bod-mockup/HANDOFF.md` (file này).
- **Round 3 (STEP-08 phần tự chủ):** `mockup/F60_D01.html`…`F60_D08.html`, `mockup/F60_D09_D12_Notes.html`, `DECISION_LOG.md` (mới), `mockup/F80_DemoExport.html` (mới), `mockup/F80_DemoExport.pdf` (mới — 4,8MB, in Chrome headless), `mockup/index.html` (nhóm 60 done + nhóm 80), `TASK.md` (v1.9 — Status/Revision Log), `HANDOFF.md` (file này, round 3).
- **Round 4 (STEP-10, DEC-33 — đúng 5 file, không hơn):** `mockup/F01B_Glossary.html` (mới), `mockup/F00A_DemoNarrative.html` (cập nhật — lời thoại Việt 16 bước + header note + legend), `PRESENTER_GUIDE.md` (mới), `mockup/index.html` (thêm 1 dòng F01B nhóm 01), `HANDOFF.md` (file này, round 4). KHÔNG sửa 30 frame màn hình, không sửa TASK.md/AUDIT.md/DECISION_LOG.md.
- **Dependency:** None — không dùng thư viện ngoài Google Fonts (Be Vietnam Pro, Inter, Material Symbols Outlined).
- **Schema/migration:** None.
- **Environment/config:** None — `.env` không bị đụng, mock data hư cấu (DEC-14), không dùng dữ liệu viec3mien.
- **Git diff/commit:** Not created — chưa commit (chờ lệnh sếp; git status hiện có `docs/UNIFIED_PLAN_v4.md` modified + `docs.zip` untracked từ trước, không thuộc task này).

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `BLK-01` | Limitation | STEP-08 đã xong phần tự chủ (trang 60, Decision Log, F80 export); **2 dry-run chờ sếp làm presenter**; STEP-09 (S05) chưa chạy | AC-12 chưa đóng hoàn toàn; S05 chưa có | Sếp chạy dry-run khi sẵn sàng (đã xác nhận "quay lại STEP-08 khi sếp sẵn sàng") |
| `BLK-10` | Deviation | PDF export dùng **Chrome headless** (Edge headless không xuất file dù chạy 2 lần) | Vẫn đúng "browser print" (DEC-27) — chỉ khác trình duyệt | Chấp nhận Chrome là trình duyệt in? |
| `BLK-02` | Deviation | Drawer frame (S02A/S02B/S03_Resolve/S04A) dựng trên underlying truncated + note "bị scrim làm mờ" | Không duplicate nguyên frame nền trong file drawer | Chấp nhận pattern (file tự chứa, PDD §4.4 đòi drawer trên đúng ngữ cảnh) hay yêu cầu full nền? |
| `BLK-03` | Deviation | Tab "Client receivable" cùng file với S04_Reconciliation_Internal (anchor), không phải file riêng | 1 file chứa 2 tab vendor/client + file MarginComparison riêng | Chấp nhận (frame inventory §4.5 chỉ có 2 tên file S04 nội bộ)? |
| `BLK-04` | Deviation | Bulk "Đánh dấu đã xử lý" là link trực tiếp → S03_Attendance_Resolved | Thêm 1 path ngoài 11 hotspot §8.3 | Chấp nhận là fast-path minh họa (không đưa vào hotspot map)? |
| `BLK-05` | Deviation | TASK.md v1.4: sửa "43 dòng ẩn gộp" → "44" (47 workers − 3 hiển thị) | AC-02 sẽ cộng tay; text cũ lệch số workers | Đã tự xử lý (Planner sửa contract + Revision Log v1.4) |
| `BLK-06` | Limitation | Stitch MCP chưa xuất hiện trong session dù sếp đã thêm | Không ảnh hưởng medium HTML (DEC-27) | Nếu Stitch xuất hiện: dùng bổ trợ cho hi-fi/variant, không thay thế HTML path |
| `BLK-07` | Deviation | Hotspot #9 PDD §8.3 ghi "Nguyễn Văn Nam" — §4.5 locked scenario dùng dòng Bùi Đức Long | Đích Lineage drawer giữ nguyên; tên dòng khác | Chấp nhận + đã ghi deviation trong F50? |
| `BLK-08` | Enhancement | S04B_VendorPreview_Sent không có back-link → thêm nút "Về HRP" → S04 | Khớp F50 back-path #10; không đổi nghiệp vụ | Chấp nhận? |
| `BLK-09` | Enhancement | Sidebar "Dự án" 3 frame S03 trỏ → S02_Staffing (trước là `#`) | Back-path hotspot #5 mượt hơn; đúng mô hình nav | Chấp nhận? |
| `BLK-11` | Deviation (tuân thủ DEC-33) | F01B dùng nguyên 21 thuật ngữ + nghĩa theo danh sách DEC-33 — mục không kèm ví dụ trong danh sách thì không thêm ví dụ mới ("không thêm bớt nghĩa"); lời thoại Việt F00A là diễn đạt dễ nói (thẻ `VI`), giữ nguyên lời thoại gốc bên cạnh | Presenter có 2 bản để chọn giọng; glossary tránh bịa nghĩa | Xác nhận giữ nguyên cách diễn đạt tự nhiên thay vì dịch từng chữ? (không chặn — AC-16 pass) |

## 6. Evidence Index

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `mockup/index.html` | Bản đồ 10 nhóm / 40 frame, 22 đã dựng (STEP-01/02/03 ✓), status từng frame |
| `E-02` | `mockup/_assets/hrp.css` | Tokens G27 canonical + toàn bộ component class dùng chung (DEC-27 không detach) |
| `E-03` | `mockup/_assets/frame.js` | Labelbar + scale-to-fit 1440×900 (AC-10 kiến trúc) |
| `E-04` | `mockup/F00A_DemoNarrative.html` | Click-path 16 bước + 3 khoảnh khắc bắt buộc (AC-01 walkthrough) |
| `E-05` | `mockup/S03_Attendance_Exceptions.html` | Taxonomy 7/7, blocker trước, readiness 5/7 (AC-08, AC-09) |
| `E-06` | `mockup/S04_Reconciliation_Internal.html` + `S04_MarginComparison.html` | Totals + validation rules §4.4 (AC-02) |
| `E-07` | `mockup/S04A_Lineage_Drawer.html` | Phép tính Long vendor/client/margin đầy đủ (AC-02) |
| `E-08` | `mockup/S04B_VendorPreview_Sent.html` | Ẩn client rate/margin/salary với đối tác (AC-03, PDD §6.5) |
| `E-09` | `docs/tasks/hrp-v4-bod-mockup/TASK.md` (v1.7) | Contract + Revision Log (AC-14) |
| `E-10` | `mockup/F02_ComponentSet.html` | 17 component PDD §8.2, class chung hrp.css, không detach (DEC-27) |
| `E-11` | `mockup/F50_HotspotMap.html` | 11 hotspot PDD §8.3 + back-path + deviation Long/Nam (AC-12) |
| `E-12` | 12 file state `mockup/S0*_*.html` | badge `STATE ·` + note `(State minh họa STEP-06 · AC-11)` + data-frame canonical + back-link (AC-11) |
| `E-13` | `mockup/index.html` | 14 dòng done mới (12 state + F02 + F50), còn 4 todo đúng STEP sau (AC-04) |
| `E-14` | link-check script (grep href toàn bộ frame) | ALL INTERNAL LINKS OK — 36 frame, không href chết (AC-01/AC-12) |
| `E-15` | `mockup/F60_D01.html`…`F60_D08.html` + `F60_D09_D12_Notes.html` | Trang 60 đủ D01–D08 (variant A/B + recommendation + mức chặn) + D09–D12 deferred owner+due (AC-13) |
| `E-16` | `DECISION_LOG.md` | D01–D12 owner + due + trạng thái + checklist sau buổi BoD (RQ-11, AC-13) |
| `E-17` | `mockup/F80_DemoExport.html` | 16 bước đúng thứ tự F00A + 3 khoảnh khắc bắt buộc tô cam + print CSS (RISK-03) |
| `E-18` | `mockup/F80_DemoExport.pdf` | PDF dự phòng 4,8MB in từ browser (DEC-27) |
| `E-19` | `TASK.md` v1.9 | Contract: Status round 3 + Revision Log v1.9 (AC-14) |
| `E-20` | `mockup/F01B_Glossary.html` | 21 thuật ngữ EN→VI, 4 nhóm module S01–S04, watermark có dấu, tokens G27 (AC-16) |
| `E-21` | `mockup/F00A_DemoNarrative.html` | 16/16 lời thoại có bản diễn đạt Việt (thẻ `VI`) + header note DEC-33, click-path không đổi (AC-16) |
| `E-22` | `PRESENTER_GUIDE.md` | Bảng 21 thuật ngữ + 3 mẹo 15 phút + nhắc 11 hotspot/≤15 phút + quy ước glossary ngoài giờ dry-run (AC-16) |
| `E-23` | `mockup/index.html` | Dòng `F01B_Glossary.html` nhóm 01 Foundations — done (AC-16) |
| `E-24` | link-check grep (STEP-10) | index→F01B OK · F01B→F00A/PRESENTER_GUIDE OK · F00A→F01B OK · 16 link bước F00A không đổi (AC-16) |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.4` | `READY_FOR_AUDIT` | STEP-01/02/03: 22 frame low-fi + assets + HANDOFF round 1; Tier 3 append AUDIT.md round 1 (AUD-001…006) → Planner Resolution v1.6 |
| `2` | `v1.7` | `READY_FOR_AUDIT` | STEP-05/06: hi-fi toàn bộ + F02_ComponentSet + F50_HotspotMap + 12 state + wire/verify 11 hotspot + link-check OK; chờ Tier 3 append AUDIT.md round 2 (viewport 1366×768, accessibility, totals, timing) |
| `3` | `v1.9` | `READY_FOR_AUDIT` | STEP-08 phần tự chủ: trang 60 (F60_D01…D08 + F60_D09_D12_Notes) + DECISION_LOG.md + F80_DemoExport HTML/PDF + index nhóm 60/80; chờ Tier 3 append AUDIT.md round 3 (trang 60 variant, Decision Log RQ-11, export đúng thứ tự, deviation Chrome print) |
| `4` | `v1.12` | `READY_FOR_AUDIT` | STEP-10 (DEC-33 — bộ công cụ diễn thuyết tiếng Việt): F01B_Glossary (21 thuật ngữ, 4 nhóm) + F00A lời thoại Việt 16 bước + PRESENTER_GUIDE.md + index dòng F01B; chờ Tier 3 append AUDIT.md round 4 (AC-16: ≥15 thuật ngữ, 16 lời thoại, guide 3 phần, UI 30 frame không Việt hóa) |

> Handoff status: `READY_FOR_AUDIT`
