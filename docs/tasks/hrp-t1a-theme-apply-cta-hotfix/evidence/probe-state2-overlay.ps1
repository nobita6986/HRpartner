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
function mixBg([string]$top, [string]$bot, [double]$alpha) {
  $hT = $top.TrimStart('#'); $hB = $bot.TrimStart('#')
  $rT = [Convert]::ToInt32($hT.Substring(0,2), 16)
  $gT = [Convert]::ToInt32($hT.Substring(2,2), 16)
  $bT = [Convert]::ToInt32($hT.Substring(4,2), 16)
  $rB = [Convert]::ToInt32($hB.Substring(0,2), 16)
  $gB = [Convert]::ToInt32($hB.Substring(2,2), 16)
  $bB = [Convert]::ToInt32($hB.Substring(4,2), 16)
  $r = [int]([Math]::Round($rT * $alpha + $rB * (1 - $alpha)))
  $g = [int]([Math]::Round($gT * $alpha + $gB * (1 - $alpha)))
  $b = [int]([Math]::Round($bT * $alpha + $bB * (1 - $alpha)))
  return ('#{0:x2}{1:x2}{2:x2}' -f $r, $g, $b)
}
$themes = @{
  'hrp'             = @{ pc = '#fde6d8'; pf = '#ffdbce'; pD = '#a63b00' }
  'ocean-trust'     = @{ pc = '#d6ebf5'; pf = '#d6ebf5'; pD = '#0d4a63' }
  'emerald-growth'  = @{ pc = '#d2ebde'; pf = '#d2ebde'; pD = '#0d5a39' }
  'violet-future'   = @{ pc = '#e1d5f4'; pf = '#e1d5f4'; pD = '#3f1f7a' }
  'executive-gold'  = @{ pc = '#f0e6c0'; pf = '#f0e6c0'; pD = '#5d4a08' }
}
$onPrimary = '#ffffff'
$alpha = 0.85
'=== STATE 2: WHITE on bg-primary-dark/85 overlay (R2) ===' | Write-Output
'    Container: text-on-primary (white) = #ffffff.' | Write-Output
'    Overlay : bg-primary-dark/85 (R2, tăng từ /55 của R1).' | Write-Output
'    Probe: white on mix(PD, PC, 0.85) + mix(PD, PF, 0.85), 5/5 theme.' | Write-Output
'    Target ≥ 4.5:1 (WCAG AA normal text).' | Write-Output
'' | Write-Output
$allPass = $true
foreach ($k in $themes.Keys) {
  $p = $themes[$k]
  $overPC = mixBg $p.pD $p.pc $alpha
  $overPF = mixBg $p.pD $p.pf $alpha
  $wPC = cr $onPrimary $overPC
  $wPF = cr $onPrimary $overPF
  $tagPC = if ($wPC -ge 4.5) { 'PASS' } else { 'FAIL'; $allPass = $false }
  $tagPF = if ($wPF -ge 4.5) { 'PASS' } else { 'FAIL'; $allPass = $false }
  '{0,-16} overPC={1} white={2:N3} ({3})  overPF={4} white={5:N3} ({6})' -f $k, $overPC, $wPC, $tagPC, $overPF, $wPF, $tagPF | Write-Output
}
'' | Write-Output
'=== Reference: alpha sweep HRP (worst case 5/5) ===' | Write-Output
$h = $themes['hrp']
foreach ($a in @(0.55, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90)) {
  $overPF = mixBg $h.pD $h.pf $a
  $wPF = cr $onPrimary $overPF
  'alpha={0,4:N2}  overPF={1}  white={2:N3}  ({3})' -f $a, $overPF, $wPF, $(if ($wPF -ge 4.5) { 'PASS' } else { 'FAIL' }) | Write-Output
}
'' | Write-Output
if ($allPass) { 'STATE2 RESULT: 5/5 PASS ≥ 4.5:1' | Write-Output } else { 'STATE2 RESULT: FAIL — xem dòng trên' | Write-Output }
exit $(if ($allPass) { 0 } else { 1 })
