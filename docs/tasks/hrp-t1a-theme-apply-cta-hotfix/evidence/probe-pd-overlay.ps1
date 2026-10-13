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
function compOver([string]$top, [string]$bot, [double]$alpha) {
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
'=== State 2 alt: PD on overlay-55% ===' | Write-Output
foreach ($k in $themes.Keys) {
  $p = $themes[$k]
  $overPC = compOver $p.pD $p.pc 0.55
  $overPF = compOver $p.pD $p.pf 0.55
  '{0,-16} PD/overPC={1:N3} PD/overPF={2:N3}' -f $k, (cr $p.pD $overPC), (cr $p.pD $overPF) | Write-Output
}
