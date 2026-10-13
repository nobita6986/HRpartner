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
$pal = @{
  'hrp'             = @{ pc = '#a63b00'; pf = '#ffdbce'; onP = '#ffffff'; pD = '#a63b00' }
  'ocean-trust'     = @{ pc = '#0d4a63'; pf = '#d6ebf5'; onP = '#ffffff'; pD = '#0d4a63' }
  'emerald-growth'  = @{ pc = '#0d5a39'; pf = '#d2ebde'; onP = '#ffffff'; pD = '#0d5a39' }
  'violet-future'   = @{ pc = '#3f1f7a'; pf = '#e1d5f4'; onP = '#ffffff'; pD = '#3f1f7a' }
  'executive-gold'  = @{ pc = '#5d4a08'; pf = '#f0e6c0'; onP = '#ffffff'; pD = '#5d4a08' }
}
foreach ($k in $pal.Keys) {
  $p = $pal[$k]
  $whiteOnPC = cr $p.onP $p.pc
  $whiteOnPF = cr $p.onP $p.pf
  $pdOnPC = cr $p.pD $p.pc
  $pdOnPF = cr $p.pD $p.pf
  '{0,-16} white/PC={1:N3}  white/PF={2:N3}  PD/PC={3:N3}  PD/PF={4:N3}' -f $k, $whiteOnPC, $whiteOnPF, $pdOnPC, $pdOnPF
}
