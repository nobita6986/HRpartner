# HANDOFF — `hrp-v6-ui-04c1-r5-footer-spacing-fix`

## Round R5 — Outcome

Owner reject R4 (commit `0e866ca`) 11/09/2026 01:04 UTC+7: spacing ở cột "CÔNG TY TNHH HRP VIỆT NAM" giãn quá xa do `justify-between` + `gap-0` đẩy items phân bố đều top↔bottom khi cột có nhiều items.

**Fix R5**: revert `justify-between gap-0` → `gap-y-3` (cột 1 wrapper + cột 2 wrapper + services list) + `gap-y-2` (contact items block).

- `gap-y-3` = 12px (chỉ vertical) → spacing thoáng tự nhiên
- `gap-y-2` = 8px (chỉ vertical) → 4 contact items cách nhau vừa phải
- KHÔNG `justify-between` → items xếp từ trên xuống dưới theo flow tự nhiên
- KHÔNG `gap-3` cũ (R3 spacing đã bị Owner complain "giãn" — `gap-y-3` mới dùng `gap-y` vertical-only, không có horizontal gap ngầm)

## Commit

- Branch: `main`
- SHA: `15f6b27`
- Message: `feat(ui): hrp-v6-ui-04c1-r5-footer-spacing-fix fast round -- revert R4 justify-between+gap-0 thanh gap-y-3/gap-y-2 vi spacing R4 qua giãn (Owner feedback 11/09 01:04)`
- Pushed: ✅ `719cd1e..15f6b27 main -> main`
- Files: `app/components/GlobalFooter.tsx` (+2/-4), `docs/tasks/hrp-v6-ui-04c1-r5-footer-spacing-fix/TASK.md` (+129)
- Vercel auto-deploy trigger từ main push

## Diff details

```diff
@@ cột 1 wrapper @@
- <div className="flex flex-col justify-between gap-0">
+ <div className="flex flex-col gap-y-3">

@@ contact items block (4 items) @@
- <div className="flex flex-col justify-between gap-0">
+ <div className="flex flex-col gap-y-2">

@@ cột 2 wrapper @@
- <div className="flex flex-col justify-between gap-0">
+ <div className="flex flex-col gap-y-3">

@@ services list (5 items) @@
- <ul className="... flex flex-col justify-between gap-0 ...">
+ <ul className="... flex flex-col gap-y-3 ...">
```

## Gates

| Gate | Result |
|---|---|
| Local `npm run typecheck` | ✅ exit 0 |
| Visual Vercel auto-deploy | ⏳ https://hrpvietnam.com/ (deploy thành công từ main push; anh refresh page) |

## Visual verification

Anh refresh **https://hrpvietnam.com/** scroll xuống footer.

Check 3 điểm:
1. ✅ Vẫn KHÔNG có dòng "HRP Co.,Ltd"
2. ✅ Cột 1 (Công ty): 7 dòng (tên VN + tên EN + địa chỉ + 2 hotline + email + website) cách nhau khoảng 12px giữa info blocks, 8px giữa contact items
3. ✅ Cột 2 (Dịch vụ): 5 services items cách nhau khoảng 12px — đọc thoáng, không giãn

## Why gap-y-N thay gap-N

`gap-y-N` (Tailwind v4) chỉ set row-gap, không set column-gap. Vì flex column layout chỉ stack dọc, không có horizontal neighbors, dùng `gap-y-N` là đúng ngữ nghĩa + không có side-effect horizontal.

## So sánh spacing qua các round

| Round | Commit | Cột 1 wrapper | Contact items | Cột 2 wrapper | Services list | Owner verdict |
|---|---|---|---|---|---|---|
| R3 (10/09 23:21) | `9f593fa` | `gap-3` (12px) | `gap-2` (8px) | `gap-3` (12px) | `gap-2` (8px) | ACCEPTED (trước khi Owner đòi flatten) |
| R4 (11/09 00:53) | `0e866ca` | `justify-between gap-0` | `justify-between gap-0` | `justify-between gap-0` | `justify-between gap-0` | REJECTED — quá giãn |
| **R5 (11/09 01:05)** | `15f6b27` | `gap-y-3` (12px) | `gap-y-2` (8px) | `gap-y-3` (12px) | `gap-y-3` (12px) | ⏳ chờ Owner review |

Về mặt numeric, R5 về cùng spacing với R3 (12px/8px). Nếu R5 vẫn chưa OK, Tier 1 sẽ pause hỏi Owner cung cấp spacing reference cụ thể (TASK §8 Open Question Q1).

## Next round

- Nếu visual OK → closeout UI04c1, mở `hrp-v6-ui-04d-section-render` v1.6
- Nếu spacing vẫn chưa đúng → mở R6 với (a) Owner cung cấp px reference / screenshot OK, hoặc (b) đo pixel thủ công từ mockup

## Tier 1 self-review (Audit NONE — FAST lane)

3 rủi ro trọng yếu:
- **RISK-01** (gap-y-3 vẫn có thể giãn nếu Owner muốn tighter) → mitigation: giảm xuống gap-y-2 / gap-y-1 nếu feedback
- **RISK-02** (services list 12px có thể tạo cột cao hơn cột khác) → grid `1.1fr_1fr_1.1fr` cho phép chênh lệch
- **RISK-03** (R5 liên tiếp R4 — Owner feedback lần 3) → nếu R5 fail, Tier 1 PAUSE hỏi Owner trước khi R6

## Tier 1 lesson learned (ghi vào TIER1_HANDOVER §5.2)

- ❌ Round R4 em đoán ý "canh đều 2 bên" = `justify-between` cho flex column — SAI. Với 4-7 items trong cột, `justify-between` tạo khoảng trống quá lớn. Pattern đúng cho "canh đều items trong column" là spacing natural (`gap-y-N`) hoặc `justify-start` + manual `mt-auto` cho last item.
- ✅ Round R5 dùng `gap-y-N` để spacing thoáng tự nhiên — đúng semantic cho column flex.
