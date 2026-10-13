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
$pal = @{
  'hrp'             = @{ pc = '#fde6d8'; pf = '#ffdbce'; onP = '#ffffff'; pD = '#a63b00' }
  'ocean-trust'     = @{ pc = '#d6ebf5'; pf = '#d6ebf5'; onP = '#ffffff'; pD = '#0d4a63' }
  'emerald-growth'  = @{ pc = '#d2ebde'; pf = '#d2ebde'; onP = '#ffffff'; pD = '#0d5a39' }
  'violet-future'   = @{ pc = '#e1d5f4'; pf = '#e1d5f4'; onP = '#ffffff'; pD = '#3f1f7a' }
  'executive-gold'  = @{ pc = '#f0e6c0'; pf = '#f0e6c0'; onP = '#ffffff'; pD = '#5d4a08' }
}
'=== STATE 1: heroImage == null — gradient from-PC to-PF, text-primary-dark ===' | Write-Output
foreach ($k in $pal.Keys) {
  $p = $pal[$k]
  $pdOnPC = cr $p.pD $p.pc
  $pdOnPF = cr $p.pD $p.pf
  '{0,-16} PD/PC={1:N3}  PD/PF={2:N3}' -f $k, $pdOnPC, $pdOnPF | Write-Output
}
'' | Write-Output
'=== STATE 2: heroImage != null — overlay bg-primary-dark/55 alpha-composited over PC (top half) and PF (bottom half), text-on-primary ===' | Write-Output
foreach ($k in $pal.Keys) {
  $p = $pal[$k]
  # alpha 0.55: top=0.55*PD + 0.45*bg
  $overPC = compOver $p.pD $p.pc 0.55
  $overPF = compOver $p.pD $p.pf 0.55
  $wOnOverPC = cr $p.onP $overPC
  $wOnOverPF = cr $p.onP $overPF
  '{0,-16} overPC={1}  white={2:N3}  overPF={3}  white={4:N3}' -f $k, $overPC, $wOnOverPC, $overPF, $wOnOverPF | Write-Output
}
