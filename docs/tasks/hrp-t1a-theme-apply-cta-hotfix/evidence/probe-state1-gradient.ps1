function srgbToLinear([double]$c) {
  $s = $c / 255
  if ($s -le 0.03928) { $s / 12.92 } else { [Math]::Pow(($s + 0.055) / 1.055, 2.4) }
}
function rl([string]$hex) {
  $h = $hex.TrimStart('#')
  $r = [Convert]::ToInt32($h.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($h.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($h.Substring(4, 2), 16)
  0.2126 * (srgbToLinear $r) + 0.7152 * (srgbToLinear $g) + 0.0722 * (srgbToLinear $b)
}
function cr([string]$a, [string]$b) {
  $la = rl $a; $lb = rl $b
  ($([Math]::Max($la, $lb)) + 0.05) / ($([Math]::Min($la, $lb)) + 0.05)
}
function effText([string]$textHex, [string]$bgHex, [double]$op) {
  $hT = $textHex.TrimStart('#'); $hB = $bgHex.TrimStart('#')
  $rT = [Convert]::ToInt32($hT.Substring(0,2), 16)
  $gT = [Convert]::ToInt32($hT.Substring(2,2), 16)
  $bT = [Convert]::ToInt32($hT.Substring(4,2), 16)
  $rB = [Convert]::ToInt32($hB.Substring(0,2), 16)
  $gB = [Convert]::ToInt32($hB.Substring(2,2), 16)
  $bB = [Convert]::ToInt32($hB.Substring(4,2), 16)
  $r = [int]([Math]::Round($rT * $op + $rB * (1 - $op)))
  $g = [int]([Math]::Round($gT * $op + $gB * (1 - $op)))
  $b = [int]([Math]::Round($bT * $op + $bB * (1 - $op)))
  return ('#{0:x2}{1:x2}{2:x2}' -f $r, $g, $b)
}
$themes = @{
  'hrp'             = @{ pc = '#fde6d8'; pf = '#ffdbce'; pD = '#a63b00' }
  'ocean-trust'     = @{ pc = '#d6ebf5'; pf = '#d6ebf5'; pD = '#0d4a63' }
  'emerald-growth'  = @{ pc = '#d2ebde'; pf = '#d2ebde'; pD = '#0d5a39' }
  'violet-future'   = @{ pc = '#e1d5f4'; pf = '#e1d5f4'; pD = '#3f1f7a' }
  'executive-gold'  = @{ pc = '#f0e6c0'; pf = '#f0e6c0'; pD = '#5d4a08' }
}
'=== STATE 1: text-primary-dark (R2 — bỏ opacity-90) ===' | Write-Output
'    Container: text-primary-dark = PD token.' | Write-Output
'    Gradient: from-primary-container to-primary-fixed.' | Write-Output
'    Probe: PD on PC + PD on PF, 5/5 theme. Target ≥ 4.5:1.' | Write-Output
'' | Write-Output
$allPass = $true
foreach ($k in $themes.Keys) {
  $p = $themes[$k]
  $effPC = effText $p.pD $p.pc 1.0
  $effPF = effText $p.pD $p.pf 1.0
  $cPC = cr $effPC $p.pc
  $cPF = cr $effPF $p.pf
  $tagPC = if ($cPC -ge 4.5) { 'PASS' } else { 'FAIL'; $allPass = $false }
  $tagPF = if ($cPF -ge 4.5) { 'PASS' } else { 'FAIL'; $allPass = $false }
  '{0,-16} PD/PC={1:N3} ({2})  PD/PF={3:N3} ({4})' -f $k, $cPC, $tagPC, $cPF, $tagPF | Write-Output
}
'' | Write-Output
'=== Worst case (HRP) trước/sau R2 ===' | Write-Output
$h = $themes['hrp']
$effR1 = effText $h.pD $h.pf 0.9
$effR2 = effText $h.pD $h.pf 1.0
$cR1 = cr $effR1 $h.pf
$cR2 = cr $effR2 $h.pf
'R1 (opacity-90): HRP body effPD/PF = {0:N3} (FAIL < 4.5)' -f $cR1 | Write-Output
'R2 (no opacity) : HRP body effPD/PF = {0:N3} (PASS ≥ 4.5)' -f $cR2 | Write-Output
'' | Write-Output
if ($allPass) { 'STATE1 RESULT: 5/5 PASS ≥ 4.5:1' | Write-Output } else { 'STATE1 RESULT: FAIL — xem dòng trên' | Write-Output }
exit $(if ($allPass) { 0 } else { 1 })
