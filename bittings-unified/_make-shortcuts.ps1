# Creates/updates the Bittings desktop shortcuts for the UNIFIED app.
# Each launches Chrome in app mode (frameless) with its OWN user-data-dir so the
# real app, the sandbox, and the investor demo keep totally separate local data.
# Re-runnable: overwrites the three .lnk files in place. Icon = bittings-unified\Bittings.ico.

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

Make 'Bittings.lnk'         'index.html'   'app-profile'
Make 'Bittings Sandbox.lnk' 'SANDBOX.html' 'sandbox-profile'
Make 'Bittings Demo.lnk'    'START-DEMO.html' 'demo-profile'
Write-Host "Done. Icon: $icon"
