# =============================================================================
#  Creates a "Bittings" desktop shortcut that opens the demo in APP MODE
#  (a chromeless browser window: no address bar, no tabs - looks like an app),
#  using the Bittings logo as the icon. Run via "Create Desktop Shortcut.bat".
# =============================================================================
$ErrorActionPreference = 'Stop'

$folder = $PSScriptRoot
$html   = Join-Path $folder 'START-DEMO.html'
$ico    = Join-Path $folder 'Bittings.ico'
$url    = 'file:///' + (($html) -replace '\\','/')

# Find a Chromium-based browser (Chrome or Edge). Edge ships with Windows.
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
$lnkPath = Join-Path $desktop 'Bittings.lnk'

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnkPath)
$sc.TargetPath       = $browser
$sc.Arguments        = '--app="' + $url + '" --start-maximized --no-first-run'
$sc.IconLocation     = $ico
$sc.WorkingDirectory = $folder
$sc.Description       = 'Bittings - Turbo Keysmith demo'
$sc.Save()

Write-Host ''
Write-Host ('Created desktop shortcut using ' + (Split-Path $browser -Leaf)) -ForegroundColor Green
Write-Host ('  -> ' + $lnkPath)
Write-Host ''
Write-Host 'Double-click the BITTINGS icon on your Desktop to open the app.'
