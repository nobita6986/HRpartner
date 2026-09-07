#!/usr/bin/env bash
# step08-append-build-notes.sh -- phu luc cho evidence/ac19-build.txt (go-live-20 / AC-19, AC-02, AC-20).
#
# Hai viec, ca hai deu la phep do tren BAN BIEN DICH chu khong tren nguon:
#
#  (1) Bang route cua Next in ra `f` (Dynamic) hay `o` (Static) cho TUNG route. Do la ket luan cua
#      compiler ve `export const dynamic = 'force-dynamic'`, khong phai chuoi ky tu toi viet. AC-02
#      do o muc nguon (ac02-render-flags.txt); day la phep do doc lap thu hai, va la phep do duy nhat
#      chung minh co dong ay CO HIEU LUC. Bai hoc "do tren ban bien dich, khong phai nguon".
#
#  (2) Lane build lam DIRTY `public/index.html` qua `copy-static.mjs`. Path do KHONG nam trong muc 4.1.
#      Do la ly do anh chup AC-20 phai chay TRUOC build. Tep nay ghi lai trang thai cay SAU build de
#      nguoi audit thay ro ranh gioi, va de chung minh toi KHONG stage cai side effect ay.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-append-build-notes.sh
set -u
OUT=docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/ac19-build.txt

say() { printf '%s\n' "$1" >> "$OUT"; }
run() {
  say ""
  say "--- CMD: $1"
  eval "$1" >> "$OUT" 2>&1
  local code=$?
  say "=== EXIT=$code${2:-}"
}

say ""
say "=== PHU LUC 1 / doc lai KET LUAN CUA COMPILER cho AC-02, tu chinh output tren ==="
say "Legend cua Next: 'o' = Static (prerender), 'f' = Dynamic (server-rendered on demand)."
say "Neu 'export const dynamic = force-dynamic' KHONG co hieu luc, hai route duoi day se hien 'o'."
run "grep -n 'viec-lam' $OUT"
run "grep -c 'Dynamic)  server-rendered on demand' $OUT"

say ""
say "=== PHU LUC 2 / side effect cua lane build, ghi ro thay vi de nguoi doc tu phat hien ==="
say "copy-static.mjs ghi lai public/index.html. Path ay KHONG co trong muc 4.1, va toi KHONG stage no."
run "git status --porcelain"
run "git status --porcelain -- public/index.html"
run "git diff --cached --name-only | grep -c '^public/'" "   (phai 0: side effect KHONG duoc stage)"
run "git diff --cached --name-only | wc -l" "   (phai van la 44 nhu luc chup AC-20)"

printf '%s\n' "DA PHU LUC: $OUT"
