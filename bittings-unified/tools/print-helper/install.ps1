# Installs the Bittings Print Helper on the shop counter PC (run as administrator).
# Copies helper.js + print.ps1 to C:\ProgramData\BittingsPrint and registers a scheduled task that starts it
# at boot (as SYSTEM, hidden). Uninstall: Unregister-ScheduledTask 'Bittings Print Helper' -Confirm:$false; remove the folder.
#
# 8z137: the task ALSO fires every minute. While the helper is running that does nothing (a second copy is not
# started); if the helper is ever not running, it is back within a minute. ("Restart if the task fails" alone did
# not bring it back when it died on 2026-11-13.)
$dst = 'C:\ProgramData\BittingsPrint'
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'helper.js'), (Join-Path $PSScriptRoot 'print.ps1') $dst -Force
$node = (Get-Command node -ErrorAction Stop).Source
$act = New-ScheduledTaskAction -Execute $node -Argument "`"$dst\helper.js`"" -WorkingDirectory $dst
$boot  = New-ScheduledTaskTrigger -AtStartup
$watch = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 1)
$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$pri = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Stop-ScheduledTask -TaskName 'Bittings Print Helper' -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName 'Bittings Print Helper' -Action $act -Trigger $boot, $watch -Settings $set -Principal $pri -Force | Out-Null
Start-ScheduledTask -TaskName 'Bittings Print Helper'
$ok = $false
foreach ($i in 1..30) { Start-Sleep -Seconds 2; try { $s = Invoke-RestMethod http://127.0.0.1:8765/status -TimeoutSec 20; $ok = $true; $s | ConvertTo-Json -Compress; break } catch { } }
if (-not $ok) { 'helper not answering yet (it can take a minute on a busy PC)' }
