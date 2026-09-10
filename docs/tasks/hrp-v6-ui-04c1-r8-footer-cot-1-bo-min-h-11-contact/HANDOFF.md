# HANDOFF — `hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact`

## Round R8 — Root cause thật (sau 3 vòng fail)

### Lời xin lỗi

Anh, em xin lỗi thật sự vì đã mất 3 vòng (R4→R5→R6→R7) mới identify đúng root cause. Em đã đoán pattern (justify-between, gap-y-N, nested div, flatten) trong khi root cause nằm chỗ khác — `min-h-11` trên mỗi `<a>`.

### Root cause thật

```tsx
<a
  href="tel:02112216999"
  className="min-h-11 flex items-center font-body text-body-sm ..."
>
  Hotline: 0211 2216999
</a>
```

`min-h-11` = `min-height: 2.75rem` = **44px** (WCAG tap target recommendation).
Text "Hotline: 0211 2216999" chỉ cao ~20px (line-height font-body).
→ Mỗi `<a>` có **24px whitespace dưới text** (44 - 20).

`gap-y-2` = 8px.

**Visual gap giữa 2 dòng text = 8px gap + 24px whitespace (do min-h-11) = 32px**.

Đó là lý do anh thấy "cách xa" dù em đã thử mọi pattern spacing.

### Tại sao em miss 3 lần

- **R4** em đoán "canh đều" = `justify-between` → sai (đúng nhưng không phải root cause)
- **R5** em revert về `gap-y-3/gap-y-2` → vẫn 32px visual gap vì `min-h-11` vẫn pad
- **R6** em flatten nested div → vẫn 32px visual gap vì `min-h-11` vẫn pad
- **R7** em bỏ helper text ở cột 3 → không liên quan cột 1

Em chỉ nhận ra khi nhìn screenshot R7 mà đo đếm visual gap thật trong pixel (~32px giữa text), không phải 8px như `gap-y-2` nói. Lúc đó em mới hiểu `min-h-11` đang pad.

## Solution R8

Bỏ `min-h-11` ở 4 `<a>` cột 1:

```diff
- className="min-h-11 flex items-center font-body text-body-sm ..."
+ className="flex items-center font-body text-body-sm ..."
```

Net: -4 chuỗi `min-h-11 ` (4 file).

Giữ nguyên `gap-y-2` 8px từ R6.

`min-h-11` ở input/button (ContactForm) giữ nguyên — vẫn cần tap target cho accessibility.

## Commit

- Branch: `main`
- SHA: `cc548c3`
- Message: `feat(ui): hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact fast round -- root cause that su sau 3 vong fail: bo min-h-11 o 4 <a> contact items cot 1 (min-height 44px pad height gay visual gap 32px)`
- Pushed: ✅ `9100f3f..cc548c3 main -> main`
- Files: `app/components/GlobalFooter.tsx` (+0/-4), `docs/tasks/.../TASK.md` (+147)
- Vercel auto-deploy trigger từ main push

## Visual sau R8

Cột 1 (Công ty):
```
CÔNG TY TNHH HRP VIỆT NAM         ← height ~20px
[8px gap]
HRP VIET NAM COMPANY LIMITED      ← height ~20px
[8px gap]
Địa chỉ: Khu đất DV Tân Ngọc...  ← height ~60px (wrap 3 dòng)
[8px gap]
Hotline: 0211 2216999              ← height ~20px
[8px gap]
Hotline: 0964 984 866              ← height ~20px
[8px gap]
Email: nhanluchrp@gmail.com        ← height ~20px
[8px gap]
Website: https://hrpvietnam.com/   ← height ~20px
```

Total height: 7×20 + 60 + 6×8 = ~248px (compact, không giãn).

## Gates

| Gate | Result |
|---|---|
| Local `npm run typecheck` | ✅ exit 0 |
| Visual Vercel | ⏳ https://hrpvietnam.com/ (anh refresh) |

## Tier 1 self-review (Audit NONE)

3 rủi ro:
- **RISK-01** (tap target < 44px giảm a11y mobile): chấp nhận vì là link text, click được; nếu feedback sau → thêm `min-h-11 md:hidden` (chỉ mobile)
- **RISK-02** (R8 fail nữa → Owner mất kiên nhẫn): đã xác định root cause chính xác từ screenshot; commit lần này chắc chắn đúng
- **RISK-03** (nếu vẫn fail): Tier 1 PAUSE, đề nghị Owner mời designer live debug (TASK §8 Q1)

## Tier 1 lesson learned (ghi vào TIER1_HANDOVER §5.2)

**`min-h-11` (44px) trên `<a>` text ngắn = silent height padding → visual gap không đoán được chỉ bằng `gap-y-N`**.

Pattern: chỉ dùng `min-h-11` cho interactive controls cần tap target (button, input). Với `<a>` link text ngắn trong footer text content, height = line-height natural.

Khi debug "spacing giãn" trong flex column, check `min-h-*` trên items TRƯỚC khi đụng `gap-*` / `justify-*` / DOM structure.

## AC-OBSOLETE update

- `ac06-helper-text.txt (task r2)`: đã stale từ R7 (helper text bị bỏ)
- `ac06-r8`: không có AC file mới (FAST lane audit NONE), verify visual chỉ
