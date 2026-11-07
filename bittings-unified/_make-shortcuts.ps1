# Creates/updates the Bittings desktop shortcuts for the UNIFIED app.
# Each launches Chrome in app mode (frameless) with its OWN user-data-dir so the
# real app, the sandbox, and the investor demo keep totally separate local data.
# Re-runnable: overwrites the three .lnk files in place. Icon = bittings-unified\Bittings.ico.
#
# The REAL app goes through START-BITTINGS.ps1, which serves the folder on http://localhost:8088
# and opens Chrome there (never file:// — printers, cloud sign-in and the payment functions'
# origin allow-list all expect localhost). Sandbox + Demo stay on file:// in their own profiles,
# so their fake sessions live on a different origin from the real shop's.

$ErrorActionPreference = 'Stop'
$chrome  = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }
$here    = Split-Path -Parent $MyInvocation.MyCommand.Path     # ...\bittings-unified
$icon    = Join-Path $here 'Bittings.ico'
$desktop = [Environment]::GetFolderPath('Desktop')
$sh      = New-Object -ComObject WScript.Shell

function Make($name, $page, $profile) {
  $u = 'file:///' + ($here -replace '\\','/') + '/' + $page
  $lnk = $sh.CreateShortcut((Join-Path $desktop $name))
  $lnk.TargetPath = $chrome
  $lnk.Arguments  = "--app=`"$u`" --user-data-dir=`"$env:LOCALAPPDATA\TurboKeysmith\$profile`" --start-maximized --no-first-run --no-default-browser-check"
  $lnk.IconLocation = "$icon,0"
  $lnk.WorkingDirectory = $here
  $lnk.Save()
  Write-Host "wrote: $name  ->  $page"
}

function MakeLauncher($name) {
  $lnk = $sh.CreateShortcut((Join-Path $desktop $name))
  $lnk.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $lnk.Arguments  = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$(Join-Path $here 'START-BITTINGS.ps1')`""
  $lnk.IconLocation = "$icon,0"
  $lnk.WorkingDirectory = $here
  $lnk.WindowStyle = 7     # minimized (the PowerShell window hides itself; Chrome opens normally)
  $lnk.Save()
  Write-Host "wrote: $name  ->  START-BITTINGS.ps1 (http://localhost:8088)"
}

MakeLauncher 'Bittings.lnk'
Make 'Bittings Sandbox.lnk' 'SANDBOX.html' 'sandbox-profile'
Make 'Bittings Demo.lnk'    'START-DEMO.html' 'demo-profile'
Write-Host "Done. Icon: $icon"
