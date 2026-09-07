#!/bin/sh
# step07-emit-evidence.sh -- go-live-20 / STEP-07.
# Sinh cac tep evidence per-AC bang LENH THAT, moi lenh kem ma thoat tien trinh.
#
# LUU Y VE DUNG CU (khai bao mot lan, HANDOFF nhac lai):
#   Cot "Verification method" cua muc 6 goi ten `Select-String`. O day dung `grep` va `node`.
#   Ly do: (1) mot duong ma hoa duy nhat -- PS 5.1 `Out-File -Append` co the chen BOM giua tep, va
#   `Select-String` doc tep UTF-8 khong BOM theo ANSI nen chuoi tieng Viet ra mojibake; (2) `grep` co
#   MA THOAT TIEN TRINH that, con `Select-String` la cmdlet nen khong co ma thoat de ghi.
#   `step07-select-string-crosscheck.txt` chay lai cac phep dem chinh bang chinh `Select-String`
#   de chung minh HAI dung cu cho CUNG con so.
#
# `grep -c` tra ma thoat 1 khi dem ra 0 -- do la ma thoat DUNG KY VONG cho cac o "phai bang 0",
# khong phai loi. Moi cho nhu vay duoc chu thich ngay tai dong.
set -u

EV='docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence'
PAGE='app/(jobs)/viec-lam/page.tsx'
DETAIL='app/(jobs)/viec-lam/[slug]/page.tsx'
PARAMS='src/domains/job-board/public-listing.params.ts'
PTEST='src/domains/job-board/public-listing.params.test.ts'
STATIC='src/domains/job-board/public-listing.static.test.ts'
VERBOSE="$EV/step07-verbose-both.txt"

OUT=''

note() { printf -- '%s\n' "$1" >> "$OUT"; }

run() {
  printf -- '--- CMD: %s\n' "$1" >> "$OUT"
  eval "$1" >> "$OUT" 2>&1
  rc=$?
  printf -- '=== EXIT=%s\n' "$rc" >> "$OUT"
}

open_file() {
  OUT="$EV/$1"
  : > "$OUT"
  note "$2"
  note "--- NGUON LANE: $VERBOSE (npm run test:unit --reporter=verbose, 52 test XANH, EXIT=0)"
}

# ---------------------------------------------------------------- AC-01
open_file 'ac01-server-only.txt' '=== AC-01 / RQ-01 -- trang ton tai va co 0 lan chi thi client ==='
run "ls -l \"$PAGE\""
note '--- (0 dong khop nen grep tra ma thoat 1: dung ky vong cho o "phai bang 0")'
run "grep -c 'use client' \"$PAGE\""
note '--- doi chieu: trang chu LA client component, nen cung phep dem tren no phai ra 1'
run "grep -c 'use client' 'app/(portal)/page.tsx'"
note '--- useState/useEffect chi xuat hien trong CHU THICH giai thich vi sao trang chu khac; hang rao'
note '--- khang dinh tren ban da bo chu thich, xem hai dong ✓ RQ-01/AC-01 duoi day'
run "grep -n 'useState\|useEffect' \"$PAGE\""
run "grep -a 'AC-01' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-02
open_file 'ac02-render-flags.txt' '=== AC-02 / RQ-01 -- cap co render, moi thu DUNG mot lan ==='
run "grep -n 'export const dynamic\|export const runtime' \"$PAGE\""
run "grep -c \"export const dynamic = 'force-dynamic'\" \"$PAGE\""
run "grep -c \"export const runtime = 'nodejs'\" \"$PAGE\""
note '--- EV-03: doi chieu voi trang chi tiet da chung minh o go-live-12 (:62 va :63)'
run "grep -n 'export const dynamic\|export const runtime' \"$DETAIL\""
run "grep -a 'AC-02' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-04
open_file 'ac04-param-allowlist.txt' '=== AC-04 / RQ-03 -- bon ten bi cam khong bao gio bi doc, cung khong bao gio bi phat ==='
run "grep -n 'BANNED_PARAMS' \"$PTEST\""
note '--- tren TEP TRANG: ba ten bi cam, dem theo bien tu (\\b) nen `salaryLabel` KHONG bi tinh la `salary`'
note '--- (0 dong khop nen ma thoat 1: dung ky vong)'
run "grep -cE '\\b(salary|shiftType|jobType)\\b' \"$PAGE\""
note '--- `limit` KHONG nam trong phep dem tren vi trang truyen `limit: PAGE_SIZE` cho service --'
note '--- day la hang cua server, khong phai tham so URL; xem dong duoi'
run "grep -n 'limit' \"$PAGE\""
run "grep -a 'AC-04' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-05
open_file 'ac05-facets-source.txt' '=== AC-05 / RQ-04 -- option select doc facets, tep KHONG khai mang hang nao ==='
note '--- lenh nay do hop dong goi ten nguyen van trong cot Verification method'
run "grep -n 'facets' \"$PAGE\""
note '--- mang hang: dem khai bao dang `const TEN = [` hoac `const TEN: Kieu = [` (0 dong => ma thoat 1)'
run "grep -cE 'const [A-Za-z_\$][A-Za-z0-9_\$]* *(:[^=]+)? *= *\\[' \"$PAGE\""
note '--- EV-07: facets den tu chinh ket qua truy van, khong tu mot loi goi thu hai'
run "grep -n 'jobs, facets, total, nextOffset' \"$PAGE\""
run "grep -a 'AC-05' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-06
open_file 'ac06-pagination.txt' '=== AC-06 / RQ-05 -- phan trang giu du bo loc o ba moc offset ==='
run "grep -n 'rel=\"prev\"\|rel=\"next\"' \"$PAGE\""
note '--- khoi nav phan trang chi render khi total > PAGE_SIZE'
run "grep -n 'total > PAGE_SIZE' \"$PAGE\""
run "grep -a 'AC-06' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-07
open_file 'ac07-canonical-url.txt' '=== AC-07 / RQ-06 -- offset 0 KHONG duoc ghi vao URL, nen trang mot la DUNG mot URL ==='
run "grep -n 'offset' \"$PARAMS\""
run "grep -a 'AC-07' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-08
open_file 'ac08-ratelimit-order.txt' '=== AC-08 / RQ-07 -- cong rate-limit dung TRUOC moi duong toi DB ==='
note '--- so dong chung minh THU TU: evaluateRateLimits truoc, nhanh tra ve som, roi moi withPublicDb'
run "grep -n 'evaluateRateLimits\|outcome.kind\|withPublicDb' \"$PAGE\""
note '--- hang rao khong dem ma so CHI SO KY TU; xem them step07-barrier-mutation-red.txt: dao thu tu'
note '--- hai cau lenh trong ma nguon lam dung hai khang dinh nay DO, khong phai mot khang dinh nao khac'
run "grep -a 'AC-08' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-09
open_file 'ac09-throttled-no-leak.txt' '=== AC-09 / RQ-07 -- nhanh bi chan khong nhan tham so, khong noi suy gia tri request ==='
run "grep -n 'function ThrottledNotice' \"$PAGE\""
note '--- EV: loi viet lay theo trang chi tiet, xem ThrottledNotice cua no'
run "grep -n 'ThrottledNotice' \"$DETAIL\""
note '--- hang rao rut RA tap ten duoc noi suy trong than nhanh do roi ghim tap ay bang mot dang thuc:'
note '--- dung ba hang module LISTING_PATH, RATE_LIMITED_MESSAGE, RATE_LIMITED_TITLE'
run "grep -a 'AC-09' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-10
open_file 'ac10-db-path.txt' '=== AC-10 / RQ-08 -- dung MOT duong toi DB, khong co duong thu hai ==='
run "grep -c 'withPublicDb(' \"$PAGE\""
run "grep -c 'listPublicJobProjection(' \"$PAGE\""
run "grep -c 'getPrisma()' \"$PAGE\""
note '--- getPrisma() CHI xuat hien lam doi so cua withPublicDb:'
run "grep -n 'withPublicDb(getPrisma()' \"$PAGE\""
note '--- 0 lan chuoi /api/jobs va 0 lan fetch( (0 dong => ma thoat 1, dung ky vong)'
run "grep -c '/api/jobs' \"$PAGE\""
run "grep -c 'fetch(' \"$PAGE\""
note '--- doi chieu EV-12: trang chu thi CO fetch /api/jobs, nen phep dem tren khong phai xanh rong'
run "grep -c '/api/jobs' 'app/(portal)/page.tsx'"
run "grep -a 'AC-10' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-11
open_file 'ac11-metadata.txt' '=== AC-11 / RQ-09 -- canonical luon sach, robots theo listingIsIndexable ==='
run "grep -n 'canonical\|robots\|listingIsIndexable\|CANONICAL_ORIGIN' \"$PAGE\""
note '--- chi co MOT canonical trong tep, va chi MOT lan index: true'
run "grep -c 'canonical:' \"$PAGE\""
run "grep -cE 'index: true' \"$PAGE\""
note '--- EV-22: CANONICAL_ORIGIN la hang, khong hard-code origin'
run "grep -n 'CANONICAL_ORIGIN' 'src/shared/routing/portal-landing.ts'"
note '--- phan "metadata bien dich duoc" do bang lane build, xem ac19-build.txt'
run "grep -a 'AC-11' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-12
open_file 'ac12-total-not-overview.txt' '=== AC-12 / RQ-10 -- nhan so ket qua doc total, 0 lan chuoi overview ==='
note '--- (0 dong khop nen ma thoat 1: dung ky vong)'
run "grep -c 'overview' \"$PAGE\""
note '--- doi chieu EV-09: chuoi overview CO thuc trong service, nen phep dem tren khong phai xanh rong'
run "grep -c 'overview' 'src/domains/job-board/public.service.ts'"
note '--- nhan dem va nhanh rong doc total cua chinh ket qua da loc:'
run "grep -n 'total' \"$PAGE\""
run "grep -a 'AC-12' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-13
open_file 'ac13-empty-state.txt' '=== AC-13 / RQ-11 -- trang thai rong: duong ve /viec-lam sach, loi nhac neu bo loc ==='
run "grep -n 'resetHref\|resetLabel\|emptyMessage' \"$PAGE\""
note '--- LISTING_PATH la hang duy nhat mang duong /viec-lam, khong hard-code chuoi duong dan'
run "grep -n \"LISTING_PATH = \" \"$PARAMS\""
run "grep -a 'AC-13' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-14
open_file 'ac14-label-parity.txt' '=== AC-14 / RQ-12 -- moi chuoi nhan cua module nhan co mat Y HET ben trang chu ==='
note '--- phep do DAN XUAT: rut TAT CA chuoi nghia ra khoi module nhan roi doi chieu tung byte voi'
note '--- trang chu. Khong liet ke tay -- do dung la diem mu cua TEXT_PAIRS o go-live-08: mot bang chi'
note '--- chua cap do chinh tac gia vua them thi luon xanh.'
run "node \"$EV/step07-label-parity.js\""
note '--- hang rao trong lane khang dinh cung mot dieu, cong san toi thieu 6 chuoi de chan xanh RONG'
run "grep -a 'AC-14' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-15
open_file 'ac15-helper-reuse.txt' '=== AC-15 / RQ-13 -- dung lai helper go-live-12, khong dinh dang ngay lan hai ==='
run "grep -n 'public-detail.meta' \"$PAGE\""
run "grep -c 'formatDeadlineDate(' \"$PAGE\""
note '--- 0 lan dinh dang ngay bang tay (0 dong => ma thoat 1, dung ky vong)'
run "grep -c 'toLocaleDateString\|Intl.DateTimeFormat' \"$PAGE\""
note '--- EV-10: ca hai ham da export san, nen day la IMPORT chu khong phai sao chep'
run "grep -n 'export function publicJobDetailPath\|export function formatDeadlineDate' 'src/domains/job-board/public-detail.meta.ts'"
note '--- phan "kieu khop" do bang lane typecheck, xem ac19-typecheck.txt'
run "grep -a 'AC-15' \"$VERBOSE\""

# ---------------------------------------------------------------- AC-18
open_file 'ac18-a11y.txt' '=== AC-18 / RQ-16 -- label gan htmlFor, min-h-11, lop focus, 0 lan color primary tran ==='
run "grep -n 'htmlFor' \"$PAGE\""
run "grep -n 'id=\"listing-' \"$PAGE\""
note '--- ba con so duoi day PHAI bang nhau; hang rao dem theo SO LAN KHOP (structure-aware), con grep -c'
note '--- dem theo SO DONG -- o tep nay hai cach cho cung 9 vi khong dong nao chua hai phan tu'
run "grep -cE '<(Link|button|input|select)\\b' \"$PAGE\""
run "grep -c 'min-h-11' \"$PAGE\""
run "grep -c 'hrp-focus' \"$PAGE\""
note '--- EV-20: 0 lan color: var(--color-primary) tran (0 dong => ma thoat 1, dung ky vong)'
run "grep -c \"color: 'var(--color-primary)'\" \"$PAGE\""
note '--- thay vao do dung --color-primary-dark, dung loi da do o go-live-15'
run "grep -n 'var(--color-primary-dark)' \"$PAGE\""
run "grep -a 'AC-18' \"$VERBOSE\""

printf -- 'DONE: da sinh 15 tep evidence per-AC trong %s\n' "$EV"
