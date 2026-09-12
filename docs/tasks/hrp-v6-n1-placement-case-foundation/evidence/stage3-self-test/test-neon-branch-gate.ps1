# test-neon-branch-gate.ps1 — exercise neon_branch_gate.ps1 against
# fake_neon_api.js across PASS + every fail-closed exit code.
#
# Audit fix 2026-09-12 23:10 (Tier-0-block round 6): previous harness
# used `Start-Process powershell -NoNewWindow -PassThru -Wait`
# combined with stderr redirect to a file. The nested-powershell
# invocation triggered PowerShell's `RemoteException` framing,
# which made `$ps.ExitCode` unreliable (the captured stderr showed
# RemoteException strings even on the PASS scenario 1). The exit
# code we measured could have been the SECOND powershell host's
# wrapper exit code, NOT the gate's real exit code.
#
# This rewrite uses `System.Diagnostics.Process` directly via
# `ProcessStartInfo` with `UseShellExecute=$false`,
# `RedirectStandardOutput=$true`, `RedirectStandardError=$true`,
# `CreateNoWindow=$true`, and reads the child's `ExitCode` from the
# `Process` instance AFTER `WaitForExit()`. Stdout and stderr are
# captured to two SEPARATE memory buffers, NOT merged via `2>&1`
# — `2>&1 | Out-String` would convert stderr text into ErrorRecord
# and can drop exit-code semantics. This harness makes NO call to
# `2>&1` or `Out-String` for the gate invocation; it only reads
# `Process.ExitCode` from a waited child.
#
# Endpoint-id policy (audit fix 2026-09-12 23:10): the PASS scenario
# uses endpoint-id `mp2-test-ep-001` — a synthesized test id that
# does NOT overlap with the documented prod fingerprint
# (`shy-tree-az32as2c`). The previous test reused the prod-shaped id,
# which is misleading when the harness itself is supposed to be a
# closed-loop offline test.
#
# Usage:
#   powershell -NoProfile -File test-neon-branch-gate.ps1
#
# Exit code: 0 if every scenario produced the EXPECTED exit code and
# the expected verdict field; non-zero otherwise.

$ErrorActionPreference = 'Continue'

$gatePath = 'C:\CodeApp\HrP\docs\tasks\hrp-v6-n1-placement-case-foundation\evidence\stage3-self-test\neon_branch_gate.ps1'
$fakePath = 'C:\Users\Admin\pg-probe\fake_neon_api.js'

# Run the gate as a child process via System.Diagnostics.Process.
# Returns a hashtable: exit, stdout, stderr. Exit code is read from
# `Process.ExitCode` AFTER the synchronous reader drain, which is the
# authoritative value (NOT any wrapper exit code).
#
# Audit fix 2026-09-12 23:10: the previous attempt used the async
# `BeginOutputReadLine` + `add_OutputDataReceived` event pattern. That
# pattern deadlocks under PowerShell's STA threading model because
# the events fire on a thread-pool worker while `WaitForExit()` blocks
# the main thread — the IO pipe fills up, the child powershell blocks
# on its next `Write-Host`, and the harness hangs forever. The fix is
# the documented synchronous pattern: drain stdout + stderr BEFORE
# `WaitForExit()`. ReadToEnd() reads the pipe until EOF, which only
# happens AFTER the child has exited and closed its end of the pipe.
# After both drains, WaitForExit returns immediately and ExitCode is
# the child's real exit code.
function Invoke-Gate([int]$port, [string]$adminEp, [string]$writerEp, [int]$expectedExit) {
  $env:NEON_API_KEY    = 'test-key'
  $env:NEON_PROJECT_ID = 'proj-123'
  $env:NEON_API_BASE   = "http://127.0.0.1:$port"
  $env:TEST_DATABASE_URL_ADMIN  = "postgresql://neondb_owner:secret@ep-${adminEp}.us-east-2.aws.neon.tech/n1probe"
  $env:TEST_DATABASE_URL_WRITER = "postgresql://app_user_writer:secret@ep-${writerEp}-pooler.us-east-2.aws.neon.tech/n1probe"

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName               = 'powershell.exe'
  $psi.Arguments              = "-NoProfile -File `"$gatePath`""
  $psi.UseShellExecute        = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.CreateNoWindow         = $true
  # No StandardInput — we don't want the child to wait on stdin.

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi

  $started = $proc.Start()
  if (-not $started) {
    return @{ exit = -1; stdout = ''; stderr = 'Failed to start child powershell.' }
  }

  # Synchronous drain: read stdout and stderr until EOF. ReadToEnd()
  # blocks until the child closes its end of the pipe, which happens
  # only after the child exits. This is the documented pattern to
  # avoid deadlocks when the child's output exceeds the pipe buffer.
  $outText = $proc.StandardOutput.ReadToEnd()
  $errText = $proc.StandardError.ReadToEnd()

  $proc.WaitForExit()
  $code = $proc.ExitCode
  $proc.Close()

  return @{
    exit   = $code
    stdout = $outText
    stderr = $errText
  }
}

function Start-FakeServer([string]$scenario, [string]$adminEp, [string]$writerEp, [int]$port) {
  $env:NEON_API_PORT = "$port"
  $p = Start-Process -FilePath "node" -ArgumentList "`"$fakePath`" --scenario $scenario --admin-ep $adminEp --writer-ep $writerEp" -NoNewWindow -PassThru
  # Wait for listen.
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 200
    $c = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($c -and $c.State -eq 'Listen') { $ready = $true; break }
  }
  if (-not $ready) { throw "Fake server scenario=$scenario did not start listening on $port" }
  return $p
}

function Stop-FakeServer($p) {
  if ($p -and -not $p.HasExited) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  }
}

function Run-Gate([string]$scenario, [string]$adminEp, [string]$writerEp, [int]$port, [int]$expectedExit, [string]$expectedVerdictFragment) {
  $result = Invoke-Gate -port $port -adminEp $adminEp -writerEp $writerEp -expectedExit $expectedExit
  $code = $result.exit
  $outText = $result.stdout
  $errText = $result.stderr
  $verdictFragmentFound = ($outText -match $expectedVerdictFragment) -or ($errText -match $expectedVerdictFragment)
  $verdictStr = if ($verdictFragmentFound) { 'YES' } else { 'NO' }
  $ok = ($code -eq $expectedExit) -and $verdictFragmentFound
  $statusStr = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ("[{0}] scenario={1,-22} expected_exit={2,2} actual_exit={3,3} verdict_found={4,-3} expected_fragment=`"{5}`"" -f $statusStr, $scenario, $expectedExit, $code, $verdictStr, $expectedVerdictFragment)
  if (-not $ok) {
    Write-Host "  STDOUT:"
    Write-Host ($outText -split "`n" | ForEach-Object { "    | $_" } | Out-String)
    Write-Host "  STDERR:"
    Write-Host ($errText -split "`n" | ForEach-Object { "    | $_" } | Out-String)
  }
  return $ok
}

$results = @()
$basePort = 55700
$port = $basePort

# Scenario 1: PASS (admin and writer endpoint-ids on hrp_mp2_test branch,
# not primary, exact name match).
# Audit fix 2026-09-12 23:10: use endpoint-id `mp2-test-ep-001` (NOT the
# prod-shaped `shy-tree-az32as2c`) so this offline harness does not
# accidentally look like it's pointing at production.
$port += 1
$p = Start-FakeServer 'pass-hrp_mp2_test' 'mp2-test-ep-001' 'mp2-test-ep-001' $port
$results += Run-Gate 'pass-hrp_mp2_test' 'mp2-test-ep-001' 'mp2-test-ep-001' $port 0 '"gate":"PASS"'
Stop-FakeServer $p

# Scenario 2: endpoint NOT found (URL endpoint-id does not exist on
# any branch in the project).
$port += 1
$p = Start-FakeServer 'endpoint-not-found' 'nonexistent-ep-999' 'nonexistent-ep-999' $port
$results += Run-Gate 'endpoint-not-found' 'nonexistent-ep-999' 'nonexistent-ep-999' $port 12 '"gate":"REFUSE_endpoint_not_found"'
Stop-FakeServer $p

# Scenario 3: different branches (admin endpoint on branch A, writer
# endpoint on branch B).
$port += 1
$p = Start-FakeServer 'different-branches' 'ep-on-branch-A' 'ep-on-branch-B' $port
$results += Run-Gate 'different-branches' 'ep-on-branch-A' 'ep-on-branch-B' $port 13 '"gate":"REFUSE_different_branches"'
Stop-FakeServer $p

# Scenario 4: branch is primary (would-be test branch is actually the
# project primary — production guard).
$port += 1
$p = Start-FakeServer 'branch-is-primary' 'main-ep' 'main-ep' $port
$results += Run-Gate 'branch-is-primary' 'main-ep' 'main-ep' $port 14 '"gate":"REFUSE_branch_is_primary_PROD_GUARD"'
Stop-FakeServer $p

# Scenario 5: branch name mismatch (URL endpoint-ids are on a
# non-primary branch but the branch name is NOT `hrp_mp2_test`).
$port += 1
$p = Start-FakeServer 'branch-name-mismatch' 'scratch-ep' 'scratch-ep' $port
$results += Run-Gate 'branch-name-mismatch' 'scratch-ep' 'scratch-ep' $port 15 '"gate":"REFUSE_branch_name_mismatch"'
Stop-FakeServer $p

# Scenario 6: substring false match — the old `Contains()` substring
# match would have accepted `ep-shrub-extended.us-east-2.aws.neon.tech`
# as a match for endpoint-id `shrub`. The new exact match must refuse
# with exit 12 (NOT 0).
$port += 1
$p = Start-FakeServer 'substring-false-match' 'shrub' 'shrub' $port
$results += Run-Gate 'substring-false-match' 'shrub' 'shrub' $port 12 '"gate":"REFUSE_endpoint_not_found"'
Stop-FakeServer $p

$failCount = ($results | Where-Object { -not $_ }).Count
if ($failCount -gt 0) {
  Write-Host ""
  Write-Host "$failCount scenario(s) FAILED. See above for stdout/stderr."
  exit 1
}
Write-Host ""
Write-Host "All scenarios PASSED."
exit 0