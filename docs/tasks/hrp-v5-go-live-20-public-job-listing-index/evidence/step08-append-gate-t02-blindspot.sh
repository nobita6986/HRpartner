#!/usr/bin/env bash
# step08-append-gate-t02-blindspot.sh -- SUA "GHI CHU 3" cua chinh toi trong ac00-task-gate-v15.txt.
#
# Ghi chu 3 doan hai dieu, va CA HAI deu bi phep do bac:
#   (a) "T-02 chi nhan tham chieu co DUONG DAN, khong nhan ten tep tran" -- sai. Ly do thuc la ALTERNATION.
#   (b) "So dem tang la BANG CHUNG" -- sai, va day la mot LOI TIEN DOAN: sau khi viet lai moi tham chieu
#       thanh `.ai-pipeline/scripts/verify-task.ps1:NNN`, so dem VAN la 23. Du doan cua toi khong ung.
#
# Su that, doc tu ma kiem chu khong suy: regex cua T-02 o `:159` chi nhan path BAT DAU bang mot trong
# `src|app|prisma|tests|scripts|docs|public|middleware|packages`. Chuoi `.ai-pipeline/...` khong co trong
# danh sach ay. Ngay ca khuc `scripts/verify-task.ps1` ben trong no cung bi chan, vi negative lookbehind
# `(?<![\w\-\./\\])` cam ky tu ngay truoc la `/`.
#
# Hau qua phai khai: moi tham chieu `.ai-pipeline/**:NNN` trong TASK.md la KHONG duoc cong kiem. Nen
# muc 3 duoi day tu do lay ba dong ay ra, de nguoi audit khong phai tin loi toi.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-append-gate-t02-blindspot.sh
set -u
OUT=docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/ac00-task-gate-v15.txt
GATE=.ai-pipeline/scripts/verify-task.ps1

say() { printf '%s\n' "$1" >> "$OUT"; }
run() {
  say ""
  say "--- CMD: $1"
  eval "$1" >> "$OUT" 2>&1
  local code=$?
  say "=== EXIT=$code${2:-}"
}

# Tep nay TU CAT phu luc cu cua chinh no truoc khi ghi lai, nen chay lai bao nhieu lan cung ra mot ket
# qua. Lan chay dau bi hong dung mot dong: dau huyen trong chuoi nhay doi la command substitution, nen
# `say "... `.ai-pipeline/**:NNN` ..."` da DI TIM MOT TEP thay vi in chuoi. Cung cai bay da got mot lan
# o step08-append-copystatic-finding.sh, va lan nay no lot qua vi toi khong doc lai truoc khi chay.
HEAD_LINE=$(grep -n '^=== PHU LUC 1 / SUA GHI CHU 3' "$OUT" | head -1 | cut -d: -f1)
if [ -n "${HEAD_LINE:-}" ]; then
  head -n $((HEAD_LINE - 2)) "$OUT" > "$OUT.tmp"
  mv "$OUT.tmp" "$OUT"
  printf '%s\n' "DA CAT phu luc cu bat dau o dong $HEAD_LINE, ghi lai tu dau."
fi

say ""
say "=== PHU LUC 1 / SUA GHI CHU 3 -- hai menh de cua chinh toi bi bac ==="
say "Ghi chu 3 doan (a) T-02 chi nhan tham chieu CO DUONG DAN, va (b) so dem se TANG sau khi qualify."
say "Lan chay thu ba da qualify het moi tham chieu, va so dem VAN la 23. Ca hai menh de sai."
say "Ly do thuc, doc tu ma kiem: regex o dong 159 chi nhan path bat dau bang mot trong muoi tien to."

say ""
say "########## 1. DANH SACH TIEN TO cua T-02 -- doc thang tu ma kiem ##########"
run "sed -n '159p' $GATE"
run "sed -n '159p' $GATE | grep -c 'ai-pipeline'" "   (0 = tien to nay KHONG co trong danh sach; grep -c tra exit 1 khi dem 0)"
say ""
say "DOI CHUNG cho phep dem tren -- cung dang grep, tren chuoi THAT SU co mat trong cung dong ay:"
run "sed -n '159p' $GATE | grep -c 'docs'" "   (1 = 'docs' CO trong danh sach, nen phep dem tren khong bi mu)"

say ""
say "########## 2. SO DEM KHONG DOI -- phep do bac loi tien doan cua toi ##########"
say "v1.4 tra 23, va ca ba lan chay v1.5 cung tra 23, ke ca lan da qualify moi tham chieu."
say "Canh mot cai bay tu chieu: chinh GHI CHU 3 o tren cung viet chuoi '23 file:line', nen mot phep dem"
say "tho tren ca tep se tra 2 va con 2 ay KHONG phai hai ban ghi cong. Nen do rieng tung dang:"
run "grep -c '^  \[OK\]   T-02 23 file:line' $OUT" "   (1 = so ban ghi CONG con lai trong tep; gate ghi de nen chi giu lan cuoi)"
run "grep -n '23 file:line' $OUT" "   (2 = grep TU CHOI khi tep vao trung tep ra -- giu lai de thay rang buoc, khong phai loi do)"
say ""
say "Dang tren that bai vi mot le co that: tep dang duoc GHI chinh la tep dang duoc DOC. Vong qua mot"
say "ong dan thi stdin la pipe chu khong con la tep ay, nen phep do chay duoc. Giu ca hai dang de nguoi"
say "audit thay day la rang buoc cua dung cu, khong phai mot phep do that bai bi bo qua."
say ""
say "Va doc con so cua phep do duoi day cho dung: no KHONG tra 2. No tra SAU dong, vi moi cau toi viet"
say "ve chuoi ay lai sinh them mot lan xuat hien -- ke ca dong CMD cua chinh phep do nay. Do la ly do"
say "phep dem ket luan phai la phep do o tren, voi mau neo '^  [OK]   T-02 23': hai dau cach cong [OK]"
say "la HINH DANG ma van cua toi khong bao gio tao ra, nen no dem dung ban ghi cua cong va khong bao"
say "gio dem loi toi. Bai hoc: khi tep evidence noi ve chinh minh, hay neo vao hinh dang ma nguoi viet"
say "khong the phat ra, dung dem chuoi tran."
run "cat $OUT | grep -n '23 file:line'" "   (sau dong, va so nay se TANG neu ai them mot cau nua ve chuoi ay -- xem doan ngay tren)"

say ""
say "########## 3. TU DO BA DONG DUOC TRICH -- vi cong KHONG kiem ho ##########"
say "Muc 6.1 dan :115 va :117; muc 9 cong muc 10 dan :115, :117 va :185. Ba dong nguyen van:"
run "sed -n '115p' $GATE"
run "sed -n '117p' $GATE"
run "sed -n '185p' $GATE"
run "wc -l < $GATE" "   (tong dong -- chung minh ba so tren khong vuot cuoi tep)"

say ""
say "########## 4. GIOI HAN, ghi ro thay vi de nguoi audit tu phat hien ##########"
say 'LIM: tham chieu `.ai-pipeline/**:NNN` trong TASK.md nam ngoai vung T-02 quet, nen chung KHONG'
say "duoc cong xac nhan. Muc 3 o tren la phep do thay the. Toi KHONG sua regex do de mo rong vung"
say "quet: bo cong la tai san cua luong khac va muc 4.2 cam cham -- noi van pham dung cu de hop dong"
say "cua minh xanh hon la dung cai loi ma R-07 cong R-08 viet ra de chong."

printf '%s\n' "DA PHU LUC: $OUT"
