@echo off
REM ===========================================================================
REM  Turbo Keysmith / Bittings - investor demo launcher (most reliable method)
REM  Double-click this file. It serves the app locally and opens the demo,
REM  pre-filled with a sample active shop. Leave this black window open during
REM  the demo; close it when you're done.
REM ===========================================================================
cd /d "%~dp0"
echo Starting the Turbo Keysmith demo...
start "" "http://localhost:8088/START-DEMO.html"
python -m http.server 8088 1>nul 2>nul
if errorlevel 1 (
  echo.
  echo Could not start the local server because Python is not installed.
  echo No problem: just double-click START-DEMO.html instead.
  echo.
  pause
)
