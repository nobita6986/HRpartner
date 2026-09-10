# HANDOFF — `hrp-v6-ui-04c1-r6-footer-flatten-cot-1`

## Round R6 — Outcome (refactor-struct)

Owner reject R5 (commit `15f6b27`) 11/09/2026 01:10 UTC+7: cột Công ty vẫn có dòng "cách xa" so với cột Danh mục. Owner pick option `refactor-struct` ở AskQuestion.

**Root cause em phân tích**: cột 1 R5 có cấu trúc 2 cấp DOM:
- Cấp 1: `<div flex-col gap-y-3>` chứa title, subtitle, address, `<div>` (4 contact items)
- Cấp 2: `<div flex-col gap-y-2>` chứa 4 `<a>`

→ gap 12px giữa wrapper children (title↔subtitle↔address↔div-con) + gap 8px chỉ trong inner contact items → không đều → cảm giác "cách xa" ở ranh giới cấp.

**Fix R6 (refactor theo Owner directive)**:
- Bỏ nested `<div>` cho contact items (cấp 2)
- Flatten 7 children ngang cấp DOM: `<h3>` + 2 `<p>` + 4 `<a>`
- Wrapper class: `gap-y-3` → `gap-y-2` (8px đều cho mọi dòng)

Sau refactor, mọi dòng cách nhau **8px đều**, DOM depth giảm 1 cấp.

## Commit

- Branch: `main`
- SHA: `84c4d61`
- Message: `feat(ui): hrp-v6-ui-04c1-r6-footer-flatten-cot-1 fast round -- flatten 7 items cot 1 cung cap DOM, gap-y-2 (8px) deu cho moi dong; Owner 11/09 01:10 chi refactor-struct`
- Pushed: ✅ `a2d92f8..84c4d61 main -> main`
- Files: `app/components/GlobalFooter.tsx` (+21/-30), `docs/tasks/.../TASK.md` (+153)
- Vercel auto-deploy trigger từ main push

## Diff details

```diff
@@ cột 1 wrapper @@
- {/* Cột 1: Công ty */}
- <div className="flex flex-col gap-y-3">
+ {/* Cột 1: Công ty — flat list 7 items, gap-y-2 (8px) đều cho mọi dòng */}
+ <div className="flex flex-col gap-y-2">
   <h3>...</h3>
   <p>HRP VIET NAM COMPANY LIMITED</p>
   <p>Địa chỉ: ...</p>
-  <div className="flex flex-col gap-y-2">
-    <a>Hotline: 0211 2216999</a>
-    <a>Hotline: 0964 984 866</a>
-    <a>Email: nhanluchrp@gmail.com</a>
-    <a>Website: https://hrpvietnam.com/</a>
-  </div>
+  <a>Hotline: 0211 2216999</a>
+  <a>Hotline: 0964 984 866</a>
+  <a>Email: nhanluchrp@gmail.com</a>
+  <a>Website: https://hrpvietnam.com/</a>
 </div>
```

Net DOM depth giảm 1, gap đồng đều 8px.

## Visual comparison

| Round | Cột 1 cấu trúc | Cột 1 gap | Cột 2 gap | Cột 1 so với Cột 2 |
|---|---|---|---|---|
| R3 | flat 7 items, `gap-3` (12px) | 12px đều | 12px wrapper, 8px list | cùng nhịp |
| R4 | flat 7 items + `justify-between gap-0` | biến đổi, items giãn top↔bottom | biến đổi | RẤT giãn |
| R5 | nested div, `gap-y-3` outer + `gap-y-2` inner | 12px outer, 8px inner | 12px | **không đều — address ↔ hotline 1 = 12px > hotline 1 ↔ hotline 2 = 8px** |
| **R6** | flat 7 items, `gap-y-2` (8px) | 8px đều | 12px | **đều; cùng nhịp R3 nhưng tighter** |

## So với cột 2 (R6 vs R5 cột 2)

Cột 2 giữ R5 (gap-y-3 wrapper + gap-y-3 list = 12px). Cột 1 giờ 8px. Hai cột không cùng nhịp, nhưng:
- Cột 2: 5 items ngắn (1 dòng mỗi item)
- Cột 1: 7 items trong đó có 1 address wrap 3 dòng → total height ~480px
- Cột 3: ContactForm ~480px

→ visually balanced vì heights gần nhau.

## Gates

| Gate | Result |
|---|---|
| Local `npm run typecheck` | ✅ exit 0 |
| Visual Vercel | ⏳ https://hrpvietnam.com/ (anh refresh) |

## Tier 1 self-review (Audit NONE)

3 rủi ro:
- **RISK-01** (flatten làm hotline items gần địa chỉ quá): 8px + address wrap cao → visual gap = 8px OK. Nếu cần tách bạch hơn, dùng `gap-y-2.5` (10px).
- **RISK-02** (DOM depth giảm có thể ảnh hưởng a11y): aria header `<h3>` vẫn còn, không bị ảnh hưởng.
- **RISK-03** (R6 vẫn fail): đã pause hỏi Owner ở R5, Owner pick refactor-struct → Tier 1 follow đúng directive. Nếu R6 fail, Tier 1 sẽ (a) PAUSE hỏi Owner cung cấp screenshot OK / px reference, hoặc (b) mờ Owner live debug.

## Tier 1 lesson learned (ghi vào TIER1_HANDOVER §5.2)

- ❌ **R5** em dùng nested `<div>` để "nhóm" contact items = thêm DOM depth không cần thiết + tạo visual gap không đều giữa ranh giới cấp.
- ✅ **R6** flatten = tất cả items flat ngang cấp DOM, `gap-y-N` đều cho mọi dòng. Pattern: khi items trong column đều là "siblings ngữ nghĩa", flatten hết lên wrapper chung, KHÔNG group bằng nested div (trừ khi có style riêng cho group đó như border, background).
