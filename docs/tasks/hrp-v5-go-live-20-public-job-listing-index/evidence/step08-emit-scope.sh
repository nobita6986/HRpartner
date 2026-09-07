#!/usr/bin/env bash
# step08-emit-scope.sh -- sinh evidence/ac20-scope.txt cho AC-20 (go-live-20).
#
# Thu tu do dung nhu AC-20 viet: `git diff --cached --name-only` cho TAP KET LUAN, roi
# `git status --porcelain` chi de LIET KE loai tru. Khong bao gio lay `git status` lam phan quyet.
#
# Quy uoc mot lan cho ca tep: `grep -c` tra MA THOAT 1 khi dem ra 0. Moi cho "phai bang 0" duoi day
# vi the se ghi `EXIT=1` va do la KET QUA MONG DOI; de chung minh cai grep ay khong hong, moi cap co
# mot phep do DOI CHUNG tren chuoi that su co mat.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-emit-scope.sh
set -u
OUT=docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/ac20-scope.txt
: > "$OUT"

say() { printf '%s\n' "$1" >> "$OUT"; }

run() { # run <mo ta> <lenh>
  say ""
  say "--- CMD: $2"
  eval "$2" >> "$OUT" 2>&1
  local code=$?
  say "=== EXIT=$code"
}

say "=== AC-20 / pham vi thay doi -- go-live-20 ==="
say "Tap KET LUAN: git diff --cached --name-only. Tap LOAI TRU chi duoc liet ke, khong phan quyet."
say "Quy uoc: grep -c tra exit 1 khi dem 0 -- moi cho \"phai bang 0\" duoi day co exit 1 la DUNG,"
say "va di kem mot phep do doi chung tren chuoi that su co mat."

say ""
say "########## 1. TAP KET LUAN ##########"
run "tap ket luan" "git diff --cached --name-only"
run "so path trong tap ket luan" "git diff --cached --name-only | wc -l"

say ""
say "########## 2. BA PATH CUA ui-01 PHAI VANG MAT ##########"
run "ui-01 #1 phai = 0" "git diff --cached --name-only | grep -c '^app/(portal)/page\.tsx\$'"
run "ui-01 #2 phai = 0" "git diff --cached --name-only | grep -c '^app/globals\.css\$'"
run "ui-01 #3 phai = 0" "git diff --cached --name-only | grep -c '^src/domains/job-board/components/'"
say ""
say "DOI CHUNG cho ba phep dem tren: cung mot dang grep, tren chuoi THAT SU co mat trong tap ket luan."
run "doi chung: trang listing phai = 1" "git diff --cached --name-only | grep -c '^app/(jobs)/viec-lam/page\.tsx\$'"
run "doi chung: prefix slug docs phai > 0" "git diff --cached --name-only | grep -c '^docs/tasks/hrp-v5-go-live-20-public-job-listing-index/'"

say ""
say "########## 3. PHEP DO DAN XUAT: tap ket luan la TAP CON cua muc 4.1 ##########"
say "Allowlist duoc RUT tu bang muc 4.1 cua TASK.md, khong dan tay -- xem step08-scope-subset.js."
run "kiem tap con" "node docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-scope-subset.js"

say ""
say "########## 4. TAP LOAI TRU (chi liet ke -- KHONG phan quyet) ##########"
say "Vung cua Tier 1 (docs/ ngoai slug nay, .ai-pipeline/) va tep chua theo doi nam ngoai pham vi xet."
run "trang thai cay" "git status --porcelain"
run "tep chua theo doi" "git status --porcelain | grep -c '^??'"
run "path dirty ngoai index" "git status --porcelain | grep -c '^.[MD]'"

say ""
say "########## 5. DIEM BAT DONG -- doc con so o muc 4 cho dung ##########"
say 'Tep evidence noi ve TAP STAGED lai chinh la mot tep bi stage. Nen luc phep do o muc 4 chay, chinh'
say 'ac20-scope.txt dang o trang thai `AM` (da stage, roi bi ghi de boi lenh dang chay). Do la ly do'
say '"path dirty ngoai index" co the tra 1: cai 1 do la CHINH TEP NAY, khong phai mot path la.'
say 'Cach dong vong: `git add` mot lan nua SAU khi tep nay duoc ghi xong. Lan add ay chi doi BLOB cua'
say 'ac20-scope.txt, KHONG sinh path moi -- nen moi con so o muc 1 va muc 3 van dung tung chu. Trang'
say 'thai cay CUOI CUNG (sach, 0 dong `??`, 0 dong dirty) duoc do lai trong HANDOFF, khong do o day,'
say 'vi mot tep khong the ghi lai trang thai cua chinh no sau khi da ngung ghi.'
run "so dong trang thai" "git status --porcelain | wc -l"
run "kiem: dong AM duy nhat la chinh tep nay" "git status --porcelain | grep '^AM' || echo '(khong co dong AM)'"

printf '%s\n' "DA GHI: $OUT"
