#!/usr/bin/env bash
# step08-append-copystatic-finding.sh -- sua mot TIEN DE CUA CHINH TOI, ghi thang vao ac19-build.txt.
#
# Phu luc 2 cua tep ay mo dau bang mot cau khang dinh: "copy-static.mjs ghi lai public/index.html".
# Roi hai phep do ngay duoi cau ay cho thay tep KHONG dirty. De nguyen la mot tep evidence tu mau
# thuan. Nen tep nay append doan sua, kem phep do giai thich vi sao.
#
# Su that: `npm run build` = `next build` TRAN. Duong sinh public/ la `buildCommand` trong vercel.json
# (`node scripts/copy-static.mjs && npx prisma generate && next build`), khong phai lane local. Chinh
# go-live-02 da ghi dieu nay o `LIM-02` cua no.
#
# Chay tu goc worktree: bash docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-append-copystatic-finding.sh
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
say "=== PHU LUC 3 / SUA TIEN DE cua phu luc 2 ==="
say "Phu luc 2 mo dau bang \"copy-static.mjs ghi lai public/index.html\". HAI phep do ngay duoi no cho"
say "thay tep KHONG dirty. Cau mo dau ay la tien de toi mang san, va no SAI cho lane local:"
say 'lane `npm run build` la `next build` TRAN. Duong chay copy-static la buildCommand trong vercel.json.'
say "Giu nguyen thu tu do (chup AC-20 truoc build) van dung -- nhung ly do phai ghi cho dung."
run "node -e \"console.log(require('./package.json').scripts.build)\""
run "grep -n 'buildCommand' vercel.json"
run "git ls-files --error-unmatch public/index.html" "   (0 = tep CO theo doi, nen neu dirty thi status se thay)"
run "git check-ignore -v public/index.html" "   (1 = KHONG bi .gitignore che, nen phep do tren khong bi mu)"
run "git status --porcelain -- public/index.html | wc -l" "   (0 = sach sau build, khop voi LIM-02 cua go-live-02)"

printf '%s\n' "DA PHU LUC: $OUT"
