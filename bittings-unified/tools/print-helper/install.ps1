# Installs the Bittings Print Helper on the shop counter PC (run as administrator).
# Copies helper.js + print.ps1 to C:\ProgramData\BittingsPrint and registers a scheduled task that starts it
# at boot (as SYSTEM, hidden). Uninstall: Unregister-ScheduledTask 'Bittings Print Helper' -Confirm:$false; remove the folder.
$dst = 'C:\ProgramData\BittingsPrint'
New-Item -ItemType Directory -Force $dst | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'helper.js'), (Join-Path $PSScriptRoot 'print.ps1') $dst -Force
$node = (Get-Command node -ErrorAction Stop).Source
$act = New-ScheduledTaskAction -Execute $node -Argument "`"$dst\helper.js`"" -WorkingDirectory $dst
$trg = New-ScheduledTaskTrigger -AtStartup
$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$pri = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'Bittings Print Helper' -Action $act -Trigger $trg -Settings $set -Principal $pri -Force | Out-Null
Start-ScheduledTask -TaskName 'Bittings Print Helper'
Start-Sleep -Seconds 2
try { (Invoke-RestMethod http://127.0.0.1:8765/status) | ConvertTo-Json -Compress } catch { 'helper not answering yet: ' + $_.Exception.Message }
