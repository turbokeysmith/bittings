# =============================================================================
#  Creates TWO "Bittings" desktop shortcuts that each open in APP MODE
#  (a frameless / chromeless browser window: no address bar, no tabs, no
#  buttons - it looks like its own installed program), using the Bittings
#  logo as the icon. Run via "Create Desktop Shortcut.bat".
#
#    1. "Bittings"        -> the REAL staff app   (index.html)      - real data
#    2. "Bittings Demo"   -> the investor DEMO     (START-DEMO.html) - fake data
#
#  Each shortcut uses its OWN private Chrome profile (--user-data-dir) so the
#  two NEVER share data: the demo's sample shop + its fake "signed-in" token
#  can't leak into the real app, and the real app's data/sign-in can't be
#  wiped by re-opening the demo. They also stay out of your normal Chrome.
# =============================================================================
$ErrorActionPreference = 'Stop'

$folder    = $PSScriptRoot
$indexHtml = Join-Path $folder 'index.html'
$demoHtml  = Join-Path $folder 'START-DEMO.html'
$ico       = Join-Path $folder 'Bittings.ico'

function To-FileUrl([string]$p) { 'file:///' + ($p -replace '\\','/') }

# Per-shortcut Chrome profiles (kept out of OneDrive, in LocalAppData).
$appProfile  = Join-Path $env:LOCALAPPDATA 'TurboKeysmith\app-profile'
$demoProfile = Join-Path $env:LOCALAPPDATA 'TurboKeysmith\demo-profile'

# Find Google Chrome (user asked for Chrome). Fall back to Edge (also Chromium,
# also frameless) only if Chrome isn't installed.
$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) {
  Write-Host ''
  Write-Host 'Could not find Google Chrome or Microsoft Edge on this PC.' -ForegroundColor Red
  Write-Host 'Install Chrome (or Edge) and run this again.'
  exit 1
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shell   = New-Object -ComObject WScript.Shell

function New-AppShortcut($name, $url, $profile, $desc) {
  $lnkPath = Join-Path $desktop ($name + '.lnk')
  $sc = $shell.CreateShortcut($lnkPath)
  $sc.TargetPath       = $browser
  $sc.Arguments        = '--app="' + $url + '"' +
                         ' --user-data-dir="' + $profile + '"' +
                         ' --start-maximized --no-first-run --no-default-browser-check'
  $sc.IconLocation     = $ico
  $sc.WorkingDirectory = $folder
  $sc.Description       = $desc
  $sc.Save()
  Write-Host ('  -> ' + $lnkPath) -ForegroundColor Green
}

Write-Host ''
Write-Host ('Creating desktop shortcuts using ' + (Split-Path $browser -Leaf)) -ForegroundColor Cyan

New-AppShortcut 'Bittings'      (To-FileUrl $indexHtml) $appProfile  'Bittings - Turbo Keysmith staff app'
New-AppShortcut 'Bittings Demo' (To-FileUrl $demoHtml)  $demoProfile 'Bittings - Turbo Keysmith investor demo (sample data)'

Write-Host ''
Write-Host 'Done. Two icons are on your Desktop:' -ForegroundColor Green
Write-Host '   * Bittings        = the real staff app (your live data + cloud sign-in)'
Write-Host '   * Bittings Demo    = the pitch demo (sample shop; safe to play with)'
Write-Host ''
Write-Host 'Each opens in a clean full-screen window - no address bar, no tabs.'
