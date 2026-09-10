# HANDOFF — `hrp-v6-ui-04c1-r7-bỏ-helper-text-disabled`

## Round R7 — Outcome (bỏ helper text)

Owner directive 11/09/2026 01:13 UTC+7: "bỏ dòng này: nfo / Vui lòng liên hệ qua hotline hoặc email trong thời gian này."

**Giải thích "nfo"**: chữ "i" đầu của icon `info` (Material Symbols) bị copy mất ký tự đầu nên Owner thấy chỉ còn "nfo". Kết hợp với text "Vui lòng liên hệ qua hotline..." match chính xác 100% với helper text trong `ContactForm.tsx` line 100-110.

## Commit

- Branch: `main`
- SHA: `a21b586`
- Message: `feat(ui): hrp-v6-ui-04c1-r7-bo-helper-text-disabled fast round -- bo <p> info + copy trong ContactForm disabled theo Owner 11/09 01:13 directive`
- Pushed: ✅ `fd139d5..a21b586 main -> main`
- Files: `app/components/ContactForm.tsx` (+0/-11), `docs/tasks/.../TASK.md` (+125)
- Vercel auto-deploy trigger từ main push

## Diff details

```diff
@@ ContactForm.tsx line 100-110 @@
         </fieldset>
       </form>
-
-      {/* RQ-07: Helper text when disabled — new copy per Owner #10 */}
-      {disabled && (
-        <p className="flex items-start gap-1.5 font-body text-body-sm text-on-surface-variant">
-          <span className="material-symbols-outlined text-base shrink-0" aria-hidden="true">
-            info
-          </span>
-          Vui lòng liên hệ qua hotline hoặc email trong thời gian này.
-        </p>
-      )}
     </div>
   );
 }
```

Net: -11 dòng.

## Side-effect (quan trọng)

**AC-06 evidence file cũ trở thành STALE**:
- File: `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/ac06-helper-text.txt`
- Trước R7: PASS (1 match helper text)
- Sau R7: domain không còn helper text → AC đo đếm 0 match (PASS về "không có text cũ") nhưng context AC-06 (verify RQ-07 đổi copy mới) không còn ý nghĩa

→ Không sửa file evidence (đó là history), chỉ ghi note vào TIER1_HANDOVER §5.2 lesson log.

## Gates

| Gate | Result |
|---|---|
| Local `npm run typecheck` | ✅ exit 0 |
| Visual Vercel | ⏳ https://hrpvietnam.com/ (anh refresh) |

## Tier 1 self-review (Audit NONE)

3 rủi ro:
- **RISK-01** (khách không hiểu form tại sao disabled): chấp nhận theo Owner directive. Nếu feedback sau, đề xuất helper text gọn hơn.
- **RISK-02** (cột 3 chiều cao tự nhiên của form cao ~280px, không có helper): grid `1.1fr_1fr_1.1fr` chấp nhận chênh lệch.
- **RISK-03** (AC-06 stale): đã document trong TIER1_HANDOVER §5.2.

## Tier 1 lesson learned (ghi vào TIER1_HANDOVER §5.2)

- AC evidence file cũ có thể trở thành STALE sau khi Owner edit lại content — KHÔNG sửa file evidence (history), chỉ document trong lesson log.
- Khi bỏ text đã có trong AC verification, ghi rõ "AC-OBSOLETE: <reference>" để sau này tra cứu biết status.
