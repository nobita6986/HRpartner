# AC-12 cua hrp-v5-rf-05-tsc-program-boundary. Tier 3 chay lai bang:
#   powershell -NoProfile -File docs/tasks/hrp-v5-rf-05-tsc-program-boundary/evidence/s10-ac12.ps1
# Tep nay CHI chua ASCII, co chu dich: PowerShell 5.1 doc mot .ps1 UTF-8 theo codepage ANSI,
# nen moi ky tu co dau nam TRONG script se bi lam meo truoc khi parser nhin thay no --
# lan dau chay ban co dau, parser bao loi cu phap o dung dong ay. Vi vay moi mau tim co dau
# nam ngoai script, o s10-ac12-patterns.txt, va duoc doc bang -Encoding UTF8.
$ErrorActionPreference = 'Stop'
$H   = 'docs/tasks/hrp-v5-rf-05-tsc-program-boundary/HANDOFF.md'
$P   = 'docs/tasks/hrp-v5-rf-05-tsc-program-boundary/evidence/s10-ac12-patterns.txt'
$OUT = 'docs/tasks/hrp-v5-rf-05-tsc-program-boundary/evidence/s10-ac12-limitation.txt'
$L = New-Object System.Collections.ArrayList
function W($s) { [void]$L.Add([string]$s) }

W '### AC-12 -- doc muc gioi han cua HANDOFF.md bang Get-Content, dung lenh ma AC-12 chi dinh'
W '### Moi phep so sanh dung String.Contains, tuc so khop TUYET DOI tren chuoi con.'
W '### KHONG dung toan tu -like: dau backtick trong mau -like la ky tu ESCAPE cua wildcard,'
W '### nen mau *`LIM-01`* bi doc thanh "LIM-01 roi mot dau sao THAT" va tra 0 oan.'
W '### Dong VAN BAN THAT in nguyen ven nho Get-Content -Encoding UTF8 cong Out-File -Encoding utf8.'
W ''
W '$ Get-Content -LiteralPath <HANDOFF.md> -Encoding UTF8'
$all = @(Get-Content -LiteralPath $H -Encoding UTF8)
W ('  TONG_DONG=' + $all.Count)
$pat = @(Get-Content -LiteralPath $P -Encoding UTF8)
W ('  MAU_CO_DAU_DOC_TU_SIDECAR=' + $pat.Count)
W ''

$head = @{}
$cur = '(truoc muc 0)'
for ($i = 0; $i -lt $all.Count; $i++) {
  if ($all[$i].StartsWith('## ')) { $cur = $all[$i].Trim() }
  $head[$i] = $cur
}

W '== 1. Dong LIM-01 -- in NGUYEN VAN de Tier 3 doc bang mat, khong dua vao mot con so nao =='
$idx = @()
for ($i = 0; $i -lt $all.Count; $i++) { if ($all[$i].Contains('`LIM-01`')) { $idx += $i } }
W ('  SO_DONG_CHUA_`LIM-01`=' + $idx.Count)
$row = ''
$row5 = ''
foreach ($i in $idx) {
  W ''
  W ('  --- dong ' + ($i + 1) + '  thuoc ' + $head[$i] + ' ---')
  W $all[$i]
  $row = $row + "`n" + $all[$i]
  if ($head[$i] -eq '## 5. Deviations') { $row5 = $row5 + "`n" + $all[$i] }
}
W ''
W '  Muc 2 va muc 5 duoi day do TREN $row5, tuc CHI cac dong LIM-01 nam trong ## 5. Deviations,'
W '  khong phai tren ca nam dong co nhac LIM-01. Nho vay moi neo phai cung nam tren DUNG mot dong.'
W ('  SO_DONG_LIM-01_TRONG_MUC_5=' + ($row5.Split([char]10).Length - 1))
W ''
W '== 2. Ba menh de AC-12 doi, do bang neo ASCII tren CHINH dong LIM-01 =='
$probes = @(
  @{ n = 'menh de 1 -- task nay KHONG chung minh next build de yen khoa include'; p = @('next build', '`include`') },
  @{ n = 'menh de 2 -- ly do la muc 4.3 cam chay ban build';                      p = @('`4.3`', 'npm run build', 'next dev') },
  @{ n = 'menh de 3 -- phep kiem thuoc execution round 2 cua test-01';             p = @('execution round `2`', 'hrp-v5-test-01-browser-lane') },
  @{ n = 'phep phan biet -- neu ro cach do sau ban build that';                    p = @('webServer', 'git status --porcelain tsconfig.json') }
)
$allok = $true
foreach ($x in $probes) {
  W ('  ' + $x.n)
  foreach ($t in $x.p) {
    $hit = $row5.Contains($t)
    if (-not $hit) { $allok = $false }
    W ('    neo "' + $t + '" => ' + $(if ($hit) { 'CO' } else { 'KHONG' }))
  }
}
W ('  DU_CA_BON_NHOM_NEO=' + $(if ($allok) { 'CO' } else { 'KHONG' }))
W ''

W '== 3. Quet NGUOC -- khong dong nao khang dinh task nay da chung minh ban build an toan =='
W '   Mot con so khong the chung minh su VANG MAT cua mot loi khang dinh, nen day in HET moi dong'
W '   chua chuoi "build" kem de muc chua no, de Tier 3 tu doc va tu ket luan.'
$bi = @()
for ($i = 0; $i -lt $all.Count; $i++) { if ($all[$i].Contains('build')) { $bi += $i } }
W ('  SO_DONG_CHUA_"build"=' + $bi.Count)
foreach ($i in $bi) {
  W ''
  W ('  --- dong ' + ($i + 1) + '  thuoc ' + $head[$i] + ' ---')
  W $all[$i]
}
W ''
W '== 4. Neo NGUOC -- hinh dang chu cua mot loi khang dinh sai =='
W '   Cac chuoi duoi day la hinh dang ma mot cau "ban build da an toan" phai mang.'
W '   Chung la neo BO SUNG, khong phai bang chung chinh: bang chung chinh la muc 3 in day du o tren.'
foreach ($t in @('build an toan', 'build khong ghi lai', 'build-safe', 'build verified', 'da do ban build', 'build da chay', 'build da duoc')) {
  $c = 0
  foreach ($ln in $all) { if ($ln.Contains($t)) { $c++ } }
  W ('  "' + $t + '" => SO_DONG=' + $c)
}
W ''

W '== 5. Doi chieu bang mau CO DAU doc tu sidecar, khong nam trong script =='
W '   Muc dich: chung minh dong LIM-01 mang chu PHU DINH, chu khong phai chu khang dinh.'
for ($k = 0; $k -lt $pat.Count; $k++) {
  $t = $pat[$k]
  $cAll = 0
  foreach ($ln in $all) { if ($ln.Contains($t)) { $cAll++ } }
  W ('  mau[' + $k + '] TREN_DONG_LIM-01=' + $(if ($row5.Contains($t)) { 'CO' } else { 'KHONG' }) + '   CA_TEP_SO_DONG=' + $cAll)
  W ('           noi dung mau: ' + $t)
}

$L | Out-File -LiteralPath $OUT -Encoding utf8
Write-Output ('WROTE=' + $OUT + '  DONG=' + $L.Count)
