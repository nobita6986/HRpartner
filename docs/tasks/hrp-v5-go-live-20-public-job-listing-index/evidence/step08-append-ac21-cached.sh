#!/usr/bin/env bash
# step08-append-ac21-cached.sh -- PHU LUC cho evidence/ac21-single-hunk.txt (go-live-20 / AC-21).
#
# Ly do ton tai: phep do goc trong ac21-single-hunk.txt dung `git diff -U0 -- <path>` luc tep con
# CHUA staged. Sau khi STEP-08 chay `git add`, chinh chuoi lenh ay tra ve RONG. Neu de nguyen, nguoi
# audit chay lai lenh GHI TRONG TEP se thay mot ket qua khac -- dau vet cua mot so do khong tai lap
# duoc. Nen tep nay APPEND ban `--cached` tuong duong, va KHONG xoa mot dong nao cua phep do goc.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-append-ac21-cached.sh
set -u
OUT=docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/ac21-single-hunk.txt
P=src/shared/security/public-surface-limiter.static.test.ts

say() { printf '%s\n' "$1" >> "$OUT"; }
run() {
  say ""
  say "--- CMD: $1"
  eval "$1" >> "$OUT" 2>&1
  local code=$?
  say "=== EXIT=$code${2:-}"
}

say ""
say "=== PHU LUC (them o STEP-08 -- KHONG thay the phep do goc o tren) ==="
say "Phep do goc chay khi tep con CHUA staged. Sau \`git add\`, chinh lenh ay tra ve RONG vi worktree"
say "trung khit index. Ghi lai CA HAI de lenh trong tep luon tai lap duoc dung ket qua no khai."

run "git diff -U0 -- $P" "   (rong = worktree trung khit index, DUNG nhu mong doi sau git add)"
run "git diff --cached -U0 -- $P"
run "git diff --cached -U0 -- $P | grep -c '^@@'"
run "git diff --cached -U0 -- $P | grep '^@@'"
run "git diff --cached --numstat -- $P"

printf '%s\n' "DA PHU LUC: $OUT"
