# Launches the REAL Bittings app the right way on the shop PC:
#   1. makes sure the local server (_devserver.js) is running on http://localhost:8088
#   2. opens Chrome in app mode (frameless) at http://localhost:8088/index.html with its own profile
#
# Why not just double-click index.html?  A file:// page has no real origin: the printer SDKs
# (Star WebPRNT / Zebra Browser Print), cloud sign-in and the payment functions' origin
# allow-list all expect http://localhost:8088.  Every project doc says "run via localhost" —
# this script makes that the default instead of something to remember.
#
# The Sandbox and the investor Demo keep launching from file:// in their own Chrome profiles
# (see _make-shortcuts.ps1): that keeps their throwaway data on a different origin AND a
# different profile from the real shop, so they can never overwrite the real session.

$ErrorActionPreference = 'Stop'
$here   = Split-Path -Parent $MyInvocation.MyCommand.Path          # ...\bittings-unified
$port   = 8088
$url    = "http://localhost:$port/index.html"
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe' }

function PortOpen($p) {
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $p); $c.Close(); return $true } catch { return $false }
}

if (-not (PortOpen $port)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
  if (-not $node) { Write-Host "Node.js is not installed - install it (nodejs.org, LTS) and run this again."; Start-Sleep 8; exit 1 }
  Start-Process -FilePath $node -ArgumentList '"_devserver.js"', $port -WorkingDirectory $here -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(10)
  while (-not (PortOpen $port) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 200 }
  if (-not (PortOpen $port)) { Write-Host "The local server did not start on port $port."; Start-Sleep 8; exit 1 }
}

$profile = Join-Path $env:LOCALAPPDATA 'TurboKeysmith\app-profile'
Start-Process -FilePath $chrome -ArgumentList "--app=`"$url`"", "--user-data-dir=`"$profile`"", '--start-maximized', '--no-first-run', '--no-default-browser-check'
