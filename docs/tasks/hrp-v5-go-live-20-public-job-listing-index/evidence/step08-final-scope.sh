#!/usr/bin/env bash
# step08-final-scope.sh -- phep do PHAM VI CUOI CUNG cua round 1, chay SAU khi HANDOFF.md da viet xong.
#
# Vi sao can mot phep do rieng, khong dung lai con so 56 cua ac20-scope.txt: luc AC-20 chup thi
# HANDOFF.md con untracked va ba tep evidence sinh sau cung con untracked. `git add` chot lai lam
# tap staged LON HON. Neu ban giao chi khai 56 thi Tier 3 chay lai se thay mot con so khac va do
# la dung dau vet cua mot con so duoc SAO chu khong duoc DO.
#
# Diem tu quy chieu, khai truoc thay vi de nguoi audit tu phat hien: tep nay duoc TRUNCATE truoc khi
# `git add` chay, nen chinh no cung nam trong tap staged ma no dang dem. Sau khi tep duoc ghi xong no
# se o trang thai `AM` -- da stage (blob rong) roi bi ghi de. Lan `git add` CUOI cung chi doi BLOB cua
# hai tep step08-final-scope.*, KHONG sinh path moi, nen con so o muc 1 duoi day la con so CUOI.
#
# R-01 giu nguyen: chi `git add`, KHONG commit, KHONG push, KHONG deploy. `git add` co pham vi dung
# mot thu muc slug -- khong `git add -A`, khong `git add .`.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-final-scope.sh
set -u
SLUG=docs/tasks/hrp-v5-go-live-20-public-job-listing-index
OUT=$SLUG/evidence/step08-final-scope.txt
: > "$OUT"

say() { printf '%s\n' "$1" >> "$OUT"; }
run() {
  say ""
  say "--- CMD: $1"
  eval "$1" >> "$OUT" 2>&1
  local code=$?
  say "=== EXIT=$code${2:-}"
}

say "=== PHAM VI CUOI CUNG -- go-live-20 round 1 ==="
say "Chay sau khi HANDOFF.md viet xong. Quy uoc: grep -c tra exit 1 khi dem 0 -- moi cho \"phai bang 0\""
say "co exit 1 la KET QUA MONG DOI, va di kem mot phep do doi chung tren chuoi that su co mat."

say ""
say "########## 0. TRANG THAI TRUOC LAN ADD CHOT ##########"
run "git status --porcelain -- $SLUG | grep -c '^??'" "   (so tep con untracked trong slug truoc khi add)"
run "git diff --cached --name-only | wc -l" "   (tap staged TRUOC lan add chot)"

say ""
say "########## 1. LAN ADD CHOT, pham vi dung mot thu muc slug ##########"
run "git add -- $SLUG"
run "git diff --cached --name-only | wc -l" "   (tap staged SAU lan add chot -- day la con so CUOI)"
run "git diff --cached --name-only -- $SLUG | wc -l" "   (rieng phan tai lieu trong slug)"
run "git diff --cached --name-only -- app src | wc -l" "   (rieng phan ma -- phai giu nguyen 9)"

say ""
say "########## 2. HANDOFF.md phai duoc git giu -- H-01 ##########"
run "git status --porcelain -- $SLUG/HANDOFF.md"
run "git diff --cached --name-only | grep -c '^$SLUG/HANDOFF\.md\$'" "   (1 = ban ban giao da nam trong index, khong con mot buffer editor rong nao xoa duoc no)"

say ""
say "########## 3. TAP LON HON VAN LA TAP CON cua muc 4.1 ##########"
say "Chay lai chinh phep do dan xuat cua AC-20 tren tap staged MOI, khong sua mot dong nao trong script."
run "node $SLUG/evidence/step08-scope-subset.js"

say ""
say "########## 4. BA TIEN TO CUA ui-01 VAN PHAI VANG MAT ##########"
run "git diff --cached --name-only | grep -c '^app/(portal)/page\.tsx\$'" "   (phai 0)"
run "git diff --cached --name-only | grep -c '^app/globals\.css\$'" "   (phai 0)"
run "git diff --cached --name-only | grep -c '^src/domains/job-board/components/'" "   (phai 0)"
say ""
say "DOI CHUNG cho ba phep dem tren -- cung dang grep, tren chuoi THAT SU co mat trong tap staged:"
run "git diff --cached --name-only | grep -c '^app/(jobs)/viec-lam/page\.tsx\$'" "   (1 = phep dem khong bi mu)"

say ""
say "########## 5. CON LAI GI NGOAI INDEX ##########"
run "git status --porcelain -- $SLUG | grep -c '^??'" "   (0 = khong con tep nao trong slug bi bo ngoai git)"
run "git status --porcelain -- $SLUG | grep '^AM' || echo '(khong co dong AM)'" "   (dong AM neu co la chinh hai tep step08-final-scope.* -- xem docblock)"
run "git status --porcelain | grep -c '^.[MD]'" "   (path dirty ngoai index tren toan cay)"

printf '%s\n' "DA GHI: $OUT"
